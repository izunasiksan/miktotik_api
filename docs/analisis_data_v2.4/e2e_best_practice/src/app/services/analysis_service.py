# UPDATED v2.4 - INDIKATOR SINKRONISASI
import logging
import re
import time
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from prometheus_client import Counter, Histogram
from sqlalchemy import and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mikrotik import (
    BoardClientStat,
    BoardDailySummary,
    BoardInterfaceDailySummary,
    BoardInterfaceUsage,
    BoardPppoeUsage,
    BoardResourceStat,
    BoardSpeedStat,
    HotspotUsageRaw,
)

# Prometheus Metrics for Pipeline Performance
PIPELINE_STAGE_LATENCY = Histogram(
    "pipeline_stage_latency_seconds",
    "Latency of each pipeline stage in seconds",
    ["stage_name"],
)

PIPELINE_EXECUTION_COUNT = Counter(
    "pipeline_execution_total", "Total number of pipeline executions", ["status"]
)

PIPELINE_ANOMALY_DETECTED = Counter(
    "pipeline_anomaly_detected_total",
    "Total number of anomalies detected by the pipeline",
)

logger = logging.getLogger(__name__)

SAFE_TEMP_TABLE_PATTERN = re.compile(
    r"^temp_scoped_[0-9a-f]{32}_[0-9a-f]{8}_[0-9]+$"
)


def is_safe_temp_table_name(name: str) -> bool:
    return bool(SAFE_TEMP_TABLE_PATTERN.match(name))


def ensure_safe_temp_table_name(name: str) -> str:
    if not is_safe_temp_table_name(name):
        raise ValueError("Invalid temporary table name")
    return name


# UPDATE 2.4 - Portability P3: Database Abstraction for Cleanup
async def cleanup_old_temp_tables(db: AsyncSession, max_age_minutes: int = 60):
    """
    Menghapus tabel temporary (temp_scoped_%) yang sudah tua.
    Meskipun TEMPORARY TABLE otomatis dihapus saat sesi berakhir,
    dalam connection pool tabel ini bisa tertinggal jika sesi tidak ditutup.
    """
    try:
        # Check dialect for portability
        dialect = db.bind.dialect.name if db.bind else "postgresql"

        if dialect == "postgresql":
            # PostgreSQL specific cleanup for temp tables in connection pools
            query = text("""
                SELECT tablename
                FROM pg_catalog.pg_tables
                WHERE schemaname LIKE 'pg_temp_%'
                  AND tablename LIKE 'temp_scoped_%'
            """)
            res = await db.execute(query)
            tables = [r[0] for r in res.fetchall()]
        elif dialect == "sqlite":
            # SQLite handles temp tables differently, usually per connection
            # This is a placeholder for portability
            tables = []
        else:
            # Generic approach or no-op for other DBs
            logger.debug(f"UPDATE 2.4 - Cleanup not implemented for dialect: {dialect}")
            tables = []

        for table in tables:
            # Ekstrak timestamp dari nama tabel: temp_scoped_{uuid}_{timestamp}
            parts = table.split("_")
            if len(parts) >= 4:
                try:
                    ts_str = parts[-1]
                    ts = int(ts_str)
                    if (datetime.now().timestamp() - ts) > (max_age_minutes * 60):
                        logger.info(
                            f"UPDATE 2.4 - Cleaning up orphaned temp table: {table}"
                        )
                        await db.execute(text(f"DROP TABLE IF EXISTS {table}"))
                except ValueError:
                    continue

        await db.commit()
    except Exception as e:
        logger.warning(f"UPDATE 2.4 - Failed to cleanup old temp tables: {e}")
        await db.rollback()


def _determine_granularity(
    start_date: Optional[date], end_date: Optional[date], requested: str
) -> str:
    if requested != "auto":
        return requested

    if not start_date or not end_date:
        return "day"
    days = (end_date - start_date).days
    if days <= 1:
        return "hour"
    if days <= 31:
        return "day"
    if days <= 365:
        return "week"
    return "month"


def _determine_time_granularity(
    start_dt: datetime, end_dt: datetime, requested: str
) -> str:
    if requested != "auto":
        return requested
    delta = end_dt - start_dt
    days = delta.days
    if days >= 365 * 2:
        return "year"
    if days >= 60:
        return "month"
    if days >= 2:
        return "day"
    return "hour"


async def time_aggregate(
    db: "AsyncSession",
    board_id: "UUID",
    metric: str = "download_mbps",
    agg: str = "avg",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "auto",
    interface_name: Optional[str] = None,
) -> list[dict]:
    """
    Agregasi berbasis waktu dengan dukungan granularitas: year, month, day, hour, auto.
    Mendukung fungsi agregasi: sum, avg, count, min, max.
    V2.4.1: Menambahkan filter interface_name untuk mencegah pencampuran data raw.
    """
    from sqlalchemy import text

    if start_time is None or end_time is None:
        raise ValueError("start_time dan end_time wajib diisi")
    if end_time <= start_time:
        raise ValueError("end_time harus lebih besar dari start_time")

    # Normalisasi granularity
    granularity = _determine_time_granularity(start_time, end_time, granularity)
    if granularity not in ["year", "month", "day", "hour"]:
        raise ValueError(
            "granularity harus salah satu dari: year, month, day, hour, auto"
        )

    # Validasi metric dan mapping ke tabel/kolom
    metric = str(metric).lower()
    agg = str(agg).lower()
    allowed_aggs = {"sum", "avg", "count", "min", "max"}
    if agg not in allowed_aggs:
        raise ValueError("agg harus salah satu dari: sum, avg, count, min, max")

    # Map metric -> (table, column, time_col)
    # Catatan: gunakan tabel raw untuk fleksibilitas (jam/hari/bulan/tahun via date_trunc)
    metric_map = {
        "download_mbps": ("board_speed_stats", "download_mbps", "log_time"),
        "upload_mbps": ("board_speed_stats", "upload_mbps", "log_time"),
        "cpu_load": ("board_resource_stats", "cpu_load", "log_time"),
        "free_memory": ("board_resource_stats", "free_memory", "log_time"),
        "total_active": ("board_client_stats", "total_active", "log_time"),
        "total_hotspot": ("board_client_stats", "total_hotspot", "log_time"),
        "total_pppoe": ("board_client_stats", "total_pppoe", "log_time"),
        "total_tx_bytes": ("board_interface_usage", "total_tx_bytes", "log_date"),
        "total_rx_bytes": ("board_interface_usage", "total_rx_bytes", "log_date"),
        "pppoe_download": ("board_pppoe_usage", "download_bytes", "log_date"),
        "pppoe_upload": ("board_pppoe_usage", "upload_bytes", "log_date"),
        "hotspot_download": ("hotspot_usage_raw", "daily_download", "log_date"),
        "hotspot_upload": ("hotspot_usage_raw", "daily_upload", "log_date"),
    }
    if metric not in metric_map:
        raise ValueError(
            f"metric tidak dikenal: {metric}. Gunakan: download_mbps, upload_mbps, cpu_load, free_memory, total_hotspot, total_pppoe, etc."
        )

    table, column, time_col = metric_map[metric]

    # V2.4.1: Logic filter interface_name
    interface_filter = ""
    if table in ["board_speed_stats", "board_interface_usage"]:
        if interface_name:
            interface_filter = "AND interface_name = :interface_name"
        else:
            # Jika tidak ada interface_name, ambil dari primary_uplink jika memungkinkan, 
            # atau biarkan bercampur (legacy). Namun untuk V2.4.1 kita sarankan selalu ada filter.
            # logger.warning(f"time_aggregate call for {table} without interface_name filter!")
            pass

    # V2.1: Accuracy Threshold (T) mapping
    # Corrected: T is calculated based on the jump from Minute to the requested granularity.
    # We assume raw data is polled at 1-minute intervals.
    threshold_map = {
        "year": 365 * 24 * 60,  # Minute to Year
        "month": 30 * 24 * 60,  # Minute to Month
        "day": 24 * 60,  # Minute to Day
        "hour": 60,  # Minute to Hour
    }
    T = threshold_map.get(granularity, 1)

    # Compose SQL dynamically (safe identifiers; values via params)
    # Aggregator SQL expression
    agg_sql = f"{agg}({column})" if agg != "count" else "count(*)"

    query = text(f"""
        SELECT
            date_trunc(:granularity, {time_col}) as period,
            {agg_sql} as value,
            count(*) as samples,
            avg(accuracy_pct) as raw_acc
        FROM {table}
        WHERE board_id = :board_id
          {interface_filter}
          AND {time_col} >= :start_time
          AND {time_col} < :end_time
        GROUP BY period
        ORDER BY period ASC
    """)

    params = {
        "granularity": granularity,
        "board_id": str(board_id),
        "start_time": start_time,
        "end_time": end_time,
        "interface_name": interface_name,
    }

    res = await db.execute(query, params)
    rows = res.fetchall()

    # Serialize: ISO 8601 for period
    result = []
    for r in rows:
        period_val = r[0]
        samples = int(r[2] or 0)
        raw_acc = float(r[3] or 100.0)

        # V2.1: Accuracy Calculation (samples / T) * raw_acc
        # If samples >= T, accuracy depends only on raw_acc
        # If samples < T, accuracy is reduced proportionally
        accuracy_pct = min(100.0, (samples / T) * raw_acc) if T > 1 else raw_acc

        try:
            period_str = period_val.isoformat()
        except Exception:
            period_str = str(period_val)
        result.append(
            {
                "period": period_str,
                "value": float(r[1] or 0) if agg != "count" else int(r[1] or 0),
                "count": samples,
                "accuracy_pct": round(accuracy_pct, 2),
                "metadata": {
                    "raw_timestamp": period_str,  # In aggregation, we use bucket start as raw ref
                    "source_id": str(board_id),
                    "source_granularity": granularity,
                    "is_low_accuracy": accuracy_pct < 100.0,
                },
                "granularity": granularity,
                "agg": agg,
                "metric": metric,
            }
        )
    return result


async def create_scoped_dataset(
    db: AsyncSession,
    board_id: UUID,
    start_time: datetime,
    end_time: datetime,
    granularity: str = "hour",
    normalized_source: Optional[Dict[str, Any]] = None,  # V2.4: Source from Stage 0
    interface_name: Optional[str] = None,  # V2.4.1: Filter by interface
) -> str:
    """
    Stage 1: Scope & Filter (Context Lock)
    Membuat Temporary Table untuk mengunci dataset yang akan dianalisis.
    Mengembalikan nama tabel temporary yang dibuat.

    V2.4 Update: Menggunakan data hasil normalisasi (Stage 0) sebagai sumber utama.
    Jika normalized_source tidak ada, fallback ke raw stats (tidak direkomendasikan).
    """
    PIPELINE_EXECUTION_COUNT.labels(status="started").inc()
    unique_suffix = uuid4().hex[:8]
    temp_table_name = f"temp_scoped_{board_id.hex}_{unique_suffix}_{int(time.time())}"
    temp_table_name = ensure_safe_temp_table_name(temp_table_name)

    logger.info(
        f"[STAGE 1] Creating scoped dataset for board {board_id}, interface: {interface_name}, range: {start_time} - {end_time}"
    )

    start_ts = time.time()

    # Drop if exists (though it should be session-bound)
    await db.execute(text(f"DROP TABLE IF EXISTS {temp_table_name}"))

    # Create the table structure first
    create_table_query = text(f"""
        CREATE TEMPORARY TABLE {temp_table_name} (
            period timestamp,
            rx float,
            tx float,
            acc_traffic float,
            cpu float,
            mem float,
            acc_resource float,
            hotspot_users float,
            pppoe_users float,
            acc_users float,
            is_gap boolean DEFAULT false
        )
    """)
    await db.execute(create_table_query)

    if normalized_source and (
        "traffic" in normalized_source or "resource" in normalized_source or "users" in normalized_source
    ):
        logger.info("[STAGE 1] V2.4: Materializing from Normalized Stage 0 Source")

        # Extract data from normalized_source
        traffic_data = normalized_source.get("traffic", [])
        resource_data = normalized_source.get("resource", [])
        users_data = normalized_source.get("users", [])

        # Combine into a single map by timestamp
        combined_map = {}

        for t in traffic_data:
            ts = t.get("timestamp")
            if ts:
                combined_map[ts] = {
                    "period": ts,
                    "rx": float(t.get("rx") or 0.0),
                    "tx": float(t.get("tx") or 0.0),
                    "acc_traffic": float(t.get("acc_traffic") or t.get("accuracyPct") or 0.0),
                    "cpu": 0.0,
                    "mem": 0.0,
                    "acc_resource": 0.0,
                    "hotspot_users": 0.0,
                    "pppoe_users": 0.0,
                    "acc_users": 0.0,
                    "is_gap": bool(t.get("isGap", False)),
                }
        
        # logger.info(f"[STAGE 1] DEBUG: traffic_data keys sample: {list(combined_map.keys())[:2]}")

        for r in resource_data:
            ts = r.get("timestamp")
            if ts:
                if ts in combined_map:
                    combined_map[ts].update(
                        {
                            "cpu": float(r.get("cpu_percent_standard") or 0.0),
                            "mem": float(r.get("free_memory") or 0.0),
                            "acc_resource": float(r.get("acc_resource") or r.get("accuracyPct") or 0.0),
                            "is_gap": bool(combined_map[ts]["is_gap"])
                            or bool(r.get("isGap", False)),
                        }
                    )
                else:
                    combined_map[ts] = {
                        "period": ts,
                        "rx": 0.0,
                        "tx": 0.0,
                        "acc_traffic": 0.0,
                        "cpu": float(r.get("cpu_percent_standard") or 0.0),
                        "mem": float(r.get("free_memory") or 0.0),
                        "acc_resource": float(r.get("acc_resource") or r.get("accuracyPct") or 0.0),
                        "hotspot_users": 0.0,
                        "pppoe_users": 0.0,
                        "acc_users": 0.0,
                        "is_gap": bool(r.get("isGap", False)),
                    }

        for u in users_data:
            ts = u.get("timestamp")
            if ts:
                if ts in combined_map:
                    combined_map[ts].update(
                        {
                            "hotspot_users": float(u.get("hotspot_users") or 0.0),
                            "pppoe_users": float(u.get("pppoe_users") or 0.0),
                            "acc_users": float(u.get("acc_users") or u.get("accuracyPct") or 0.0),
                            "is_gap": bool(combined_map[ts]["is_gap"])
                            or bool(u.get("isGap", False)),
                        }
                    )
                else:
                    combined_map[ts] = {
                        "period": ts,
                        "rx": 0.0,
                        "tx": 0.0,
                        "acc_traffic": 0.0,
                        "cpu": 0.0,
                        "mem": 0.0,
                        "acc_resource": 0.0,
                        "hotspot_users": float(u.get("hotspot_users") or 0.0),
                        "pppoe_users": float(u.get("pppoe_users") or 0.0),
                        "acc_users": float(u.get("acc_users") or u.get("accuracyPct") or 0.0),
                        "is_gap": bool(u.get("isGap", False)),
                    }
        
        logger.info(f"[STAGE 1] DEBUG: combined_map example: {list(combined_map.values())[0] if combined_map else 'empty'}")
        logger.info(f"[STAGE 1] DEBUG: final combined_map size: {len(combined_map)}")

        # Insert combined data into temp table
        if combined_map:
            insert_query = text(f"""
                INSERT INTO {temp_table_name} (period, rx, tx, acc_traffic, cpu, mem, acc_resource, hotspot_users, pppoe_users, acc_users, is_gap)
                VALUES (:period, :rx, :tx, :acc_traffic, :cpu, :mem, :acc_resource, :hotspot_users, :pppoe_users, :acc_users, :is_gap)
            """)

        # Prepare values for bulk insert
        values = []
        for ts, data in combined_map.items():
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                
                row = {
                    "period": dt,
                    "rx": float(data.get("rx", 0)),
                    "tx": float(data.get("tx", 0)),
                    "acc_traffic": float(data.get("acc_traffic", 0)),
                    "cpu": float(data.get("cpu", 0)),
                    "mem": float(data.get("mem", 0)),
                    "acc_resource": float(data.get("acc_resource", 0)),
                    "hotspot_users": float(data.get("hotspot_users", 0)),
                    "pppoe_users": float(data.get("pppoe_users", 0)),
                    "acc_users": float(data.get("acc_users", 0)),
                    "is_gap": bool(data.get("is_gap", False)),
                }
                values.append(row)
            except Exception as e:
                logger.error(f"[STAGE 1] Error processing row {ts}: {e}")
                continue

        # Execute bulk insert
        if values:
            await db.execute(insert_query, values)
            logger.info(f"[STAGE 1] Materialized {len(values)} rows from Stage 0")
            
            # DEBUG: Verify data in temp table
            verify_query = text(f"SELECT count(*), avg(rx), avg(cpu), avg(hotspot_users) FROM {temp_table_name}")
            v_res = await db.execute(verify_query)
            v_row = v_res.fetchone()
            if v_row:
                logger.info(f"[STAGE 1] DEBUG: Temp Table Stats - Count={v_row[0]}, Avg RX={v_row[1]}, Avg CPU={v_row[2]}, Avg Hotspot={v_row[3]}")
            else:
                logger.warning("[STAGE 1] DEBUG: Verification query returned no results")
        else:
            logger.warning("[STAGE 1] No valid values to insert")

    else:
        # Fallback to old logic (Raw Stats) - V2.3 Legacy
        logger.warning(
            "[STAGE 1] V2.4: Normalized Source missing! Falling back to Raw Stats (Legacy)"
        )

        use_summary = (end_time - start_time).days > 365

        # V2.4.1: Logic filter interface_name for fallback queries
        interface_filter = ""
        if interface_name:
            interface_filter = "AND interface_name = :interface_name"

        if use_summary:
            logger.info(
                f"[STAGE 1] Range > 365 days detected. Using BoardInterfaceDailySummary (if interface={interface_name}) for materialization."
            )
            # Use board_interface_daily_summary if interface specified, otherwise fallback to global board_daily_summary
            if interface_name:
                query = text(f"""
                    INSERT INTO {temp_table_name} (period, rx, tx, acc_traffic, cpu, mem, acc_resource)
                    SELECT
                        log_date::timestamp as period,
                        avg_download_mbps as rx,
                        avg_upload_mbps as tx,
                        100.0 as acc_traffic,
                        0.0 as cpu,  -- CPU not available in interface-level summary
                        0.0 as mem,  -- Mem not available in interface-level summary
                        0.0 as acc_resource
                    FROM board_interface_daily_summary
                    WHERE board_id = :board_id
                      AND interface_name = :interface_name
                      AND log_date >= :start_time::date
                      AND log_date < :end_time::date
                    ORDER BY period ASC
                """)
            else:
                query = text(f"""
                    INSERT INTO {temp_table_name} (period, rx, tx, acc_traffic, cpu, mem, acc_resource)
                    SELECT
                        log_date::timestamp as period,
                        avg_download as rx,
                        avg_upload as tx,
                        100.0 as acc_traffic,
                        avg_cpu_load as cpu,
                        min_free_memory as mem,
                        100.0 as acc_resource
                    FROM board_daily_summary
                    WHERE board_id = :board_id
                      AND log_date >= :start_time::date
                      AND log_date < :end_time::date
                    ORDER BY period ASC
                """)
        else:
            query = text(f"""
                INSERT INTO {temp_table_name} (period, rx, tx, acc_traffic, cpu, mem, acc_resource)
                WITH traffic AS (
                    SELECT
                        date_trunc(:granularity, log_time) as period,
                        avg(download_mbps) as rx,
                        avg(upload_mbps) as tx,
                        avg(accuracy_pct) as acc_traffic
                    FROM board_speed_stats
                    WHERE board_id = :board_id
                      {interface_filter}
                      AND log_time >= :start_time
                      AND log_time < :end_time
                    GROUP BY period
                ),
                resource AS (
                    SELECT
                        date_trunc(:granularity, log_time) as period,
                        avg(cpu_load) as cpu,
                        avg(free_memory) as mem,
                        avg(accuracy_pct) as acc_resource
                    FROM board_resource_stats
                    WHERE board_id = :board_id
                      AND log_time >= :start_time
                      AND log_time < :end_time
                    GROUP BY period
                )
                SELECT
                    COALESCE(t.period, r.period) as period,
                    t.rx, t.tx, t.acc_traffic,
                    r.cpu, r.mem, r.acc_resource
                FROM traffic t
                FULL OUTER JOIN resource r ON t.period = r.period
                ORDER BY period ASC
            """)

        await db.execute(
            query,
            {
                "board_id": str(board_id),
                "interface_name": interface_name,
                "start_time": start_time,
                "end_time": end_time,
                "granularity": granularity,
            },
        )

    # P2: Performance Optimization - Create Index on Temp Table
    # Helps Stage 2 (Window Functions) and Stage 3 (Analytics)
    await db.execute(
        text(f"CREATE INDEX idx_{temp_table_name}_period ON {temp_table_name}(period)")
    )

    PIPELINE_STAGE_LATENCY.labels(stage_name="stage1_lock").observe(
        time.time() - start_ts
    )
    return temp_table_name


async def get_trend_analysis(
    db: AsyncSession, temp_table: str, window_size: int = 3
) -> Dict[str, Any]:
    """
    Stage 2: Trend & Aggregation.
    Menghitung Moving Average dan Summary dari Temporary Table (Scoped Dataset).
    """
    temp_table = ensure_safe_temp_table_name(temp_table)
    logger.info(f"[STAGE 2] Calculating trend analysis from {temp_table}")
    start_ts = time.time()
    # 1. Calculate Moving Average using Window Function
    query_ma = text(f"""
        SELECT
            period,
            rx,
            tx,
            AVG(rx) OVER (ORDER BY period ROWS BETWEEN :window_size PRECEDING AND CURRENT ROW) as rx_ma,
            AVG(tx) OVER (ORDER BY period ROWS BETWEEN :window_size PRECEDING AND CURRENT ROW) as tx_ma,
            cpu,
            mem,
            hotspot_users,
            pppoe_users,
            AVG(hotspot_users + pppoe_users) OVER (ORDER BY period ROWS BETWEEN :window_size PRECEDING AND CURRENT ROW) as active_users_ma
        FROM {temp_table}
        ORDER BY period ASC
    """)

    # 2. Calculate Overall Summary
    query_summary = text(f"""
        SELECT
            AVG(rx) as avg_rx, MAX(rx) as max_rx,
            AVG(tx) as avg_tx, MAX(tx) as max_tx,
            AVG(cpu) as avg_cpu, MAX(cpu) as max_cpu,
            AVG(mem) as avg_mem, MIN(mem) as min_mem,
            AVG(hotspot_users) as avg_hs, MAX(hotspot_users) as max_hs,
            AVG(pppoe_users) as avg_pp, MAX(pppoe_users) as max_pp,
            COUNT(*) as total_points,
            SUM(CASE WHEN is_gap THEN 1 ELSE 0 END) as gap_points
        FROM {temp_table}
    """)

    res_ma = await db.execute(query_ma, {"window_size": window_size})
    rows_ma = res_ma.fetchall()

    res_sum = await db.execute(query_summary)
    summary = res_sum.fetchone()
    if not summary:
        summary = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)

    total_pts = summary[12] or 1
    gap_pts = summary[13] or 0
    # Dynamic Accuracy Calculation (V2.4)
    # accuracy = (1 - (gaps / total)) * 100
    dynamic_acc = (
        (1.0 - (float(gap_pts) / float(total_pts))) * 100.0 if total_pts > 0 else 0.0
    )

    series = []
    for r in rows_ma:
        series.append(
            {
                "period": r[0].isoformat() if r[0] else None,
                "rx": float(r[1] or 0),
                "tx": float(r[2] or 0),
                "rx_ma": float(r[3] or 0),
                "tx_ma": float(r[4] or 0),
                "cpu": float(r[5] or 0),
                "mem": float(r[6] or 0),
                "hotspot_users": float(r[7] or 0),
                "pppoe_users": float(r[8] or 0),
                "active_users_ma": float(r[9] or 0),
            }
        )

    # Directional metrics (delta, growth %, peak/trough, volatility) based on RX moving average
    directional = {
        "trend_direction": "STABLE",
        "growth_percent": 0.0,
        "delta_value": 0.0,
        "peak": {"value": 0.0, "timestamp": None},
        "trough": {"value": 0.0, "timestamp": None},
        "volatility_score": 0.0,
    }

    if series:
        rx_values = [point["rx_ma"] for point in series]
        periods = [point["period"] for point in series]

        valid_indices = [i for i, v in enumerate(rx_values) if v is not None]

        if valid_indices:
            first_idx = valid_indices[0]
            last_idx = valid_indices[-1]
            first_val = float(rx_values[first_idx] or 0.0)
            last_val = float(rx_values[last_idx] or 0.0)

            delta_value = last_val - first_val
            growth_percent = (
                (delta_value / first_val) * 100.0 if first_val != 0.0 else 0.0
            )

            if growth_percent > 5.0:
                trend_direction = "UP"
            elif growth_percent < -5.0:
                trend_direction = "DOWN"
            else:
                trend_direction = "STABLE"

            peak_idx = max(valid_indices, key=lambda i: rx_values[i] or 0.0)
            trough_idx = min(valid_indices, key=lambda i: rx_values[i] or 0.0)
            peak_val = float(rx_values[peak_idx] or 0.0)
            trough_val = float(rx_values[trough_idx] or 0.0)
            peak_ts = periods[peak_idx]
            trough_ts = periods[trough_idx]

            valid_values = [float(rx_values[i] or 0.0) for i in valid_indices]
            mean_val = sum(valid_values) / float(len(valid_values))
            if len(valid_values) > 1:
                variance = sum((v - mean_val) ** 2 for v in valid_values) / float(
                    len(valid_values)
                )
            else:
                variance = 0.0
            volatility_score = variance ** 0.5

            directional = {
                "trend_direction": trend_direction,
                "growth_percent": growth_percent,
                "delta_value": delta_value,
                "peak": {"value": peak_val, "timestamp": peak_ts},
                "trough": {"value": trough_val, "timestamp": trough_ts},
                "volatility_score": volatility_score,
            }

    PIPELINE_STAGE_LATENCY.labels(stage_name="stage2_trend").observe(
        time.time() - start_ts
    )

    # Calculate average accuracy from temp table (Legacy acc_traffic/acc_resource)
    query_acc_legacy = text(
        f"SELECT avg(acc_traffic) as acc_t, avg(acc_resource) as acc_r FROM {temp_table}"
    )
    res_acc = await db.execute(query_acc_legacy)
    acc_row = res_acc.fetchone()
    avg_acc_legacy = (
        (float(acc_row[0] or 100.0) + float(acc_row[1] or 100.0)) / 2
        if acc_row
        else 100.0
    )

    # Final Accuracy is a weighted combination of legacy accuracy and gap presence
    final_acc = (dynamic_acc * 0.7) + (avg_acc_legacy * 0.3)

    return {
        "summary": {
            "traffic": {
                "rx": {"avg": float(summary[0] or 0), "max": float(summary[1] or 0)},
                "tx": {"avg": float(summary[2] or 0), "max": float(summary[3] or 0)},
            },
            "resource": {
                "cpu": {"avg": float(summary[4] or 0), "max": float(summary[5] or 0)},
                "mem": {"avg": float(summary[6] or 0), "min": float(summary[7] or 0)},
            },
            "users": {
                "hotspot": {"avg": float(summary[8] or 0), "max": float(summary[9] or 0)},
                "pppoe": {"avg": float(summary[10] or 0), "max": float(summary[11] or 0)},
                "total_avg": float((summary[8] or 0) + (summary[10] or 0)),
            },
            "data_quality": {
                "total_points": int(total_pts),
                "gap_points": int(gap_pts),
                "gap_percentage": (
                    round((gap_pts / total_pts) * 100, 2) if total_pts > 0 else 0
                ),
            },
            "directional": directional,
        },
        "series": series,
        "metadata": {
            "accuracy_pct": round(final_acc, 2),
            "is_low_accuracy": final_acc < 85.0,
            "version": "2.4",
        },
    }


async def get_advanced_analytics(db: AsyncSession, temp_table: str) -> Dict[str, Any]:
    """
    Stage 3-5: Analytics Engine.
    Menghitung Correlation, Habit, dan Anomaly dari Temporary Table.
    """
    temp_table = ensure_safe_temp_table_name(temp_table)
    logger.info(f"[STAGE 3-5] Running advanced analytics on {temp_table}")
    start_ts = time.time()
    # 1. Stage 3: Correlation (Pearson)
    query_corr = text(f"SELECT corr(rx, cpu) as pearson_r FROM {temp_table}")

    # 2. Stage 4: Habit (Peak Hour)
    query_habit = text(f"""
        SELECT extract(hour from period) as hr, avg(rx) as avg_rx
        FROM {temp_table}
        GROUP BY hr
        ORDER BY avg_rx DESC
        LIMIT 5
    """)

    # 3. Stage 5: Anomaly (Z-Score)
    # First get stats
    query_stats = text(f"SELECT avg(rx) as m, stddev(rx) as s FROM {temp_table}")

    res_corr = await db.execute(query_corr)
    corr_row = res_corr.fetchone()
    corr_val = corr_row[0] if corr_row else 0

    res_habit = await db.execute(query_habit)
    habits = [
        {"hour": int(r[0]), "avg_rx": float(r[1] or 0)} for r in res_habit.fetchall()
    ]

    res_stats = await db.execute(query_stats)
    stats = res_stats.fetchone()
    mean_rx, std_rx = (stats[0] or 0) if stats else 0, (stats[1] or 1) if stats else 1

    query_anomalies = text(f"""
        SELECT period, rx, (rx - :mean) / :std as z_score
        FROM {temp_table}
        WHERE abs((rx - :mean) / :std) > 2.0
        ORDER BY period ASC
    """)
    res_anomalies = await db.execute(query_anomalies, {"mean": mean_rx, "std": std_rx})
    anomalies = []
    for r in res_anomalies.fetchall():
        anomalies.append(
            {
                "period": r[0].isoformat(),
                "rx": float(r[1] or 0),
                "z_score": float(r[2] or 0),
            }
        )

    PIPELINE_STAGE_LATENCY.labels(stage_name="stage3_5_analytics").observe(
        time.time() - start_ts
    )
    if len(anomalies) > 0:
        PIPELINE_ANOMALY_DETECTED.inc(len(anomalies))

    return {
        "correlation": {"rx_vs_cpu": float(corr_val or 0)},
        "habit": {"peak_hours": habits},
        "anomaly": {"detected_count": len(anomalies), "items": anomalies},
        "metadata": {
            "source_id": "AnalyticsEngine-V2.1",
            "processed_at": datetime.now().isoformat(),
        },
    }


async def calculate_health_score(
    trend_data: Dict[str, Any], analytics_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Stage 6: Health Score Engine.
    Menghitung skor kesehatan berdasarkan stabilitas, utilisasi, dan anomali.
    """
    logger.info("[STAGE 6] Calculating health score")
    start_ts = time.time()
    summary = trend_data["summary"]

    # 1. Stability (30%) - Berdasarkan variasi traffic (Coefficient of Variation)
    # Jika stddev rendah dibanding mean, maka stabil.
    # Untuk simplifikasi dari summary kita gunakan proxy stabilitas
    # Di pipeline nyata kita butuh stddev dari series.
    series = trend_data["series"]
    if series:
        rx_values = [s["rx"] for s in series]
        mean_rx = sum(rx_values) / len(rx_values)
        if mean_rx > 0:
            variance = sum((x - mean_rx) ** 2 for x in rx_values) / len(rx_values)
            std_rx = variance**0.5
            cv = std_rx / mean_rx
            stability_score = max(0, 100 - (cv * 100))
        else:
            stability_score = 100  # No traffic is stable
    else:
        stability_score = 100

    # 2. Utilization (30%) - 100 - avg_cpu
    avg_cpu = summary["resource"]["cpu"]["avg"]
    utilization_score = max(0, 100 - avg_cpu)

    # 3. Anomaly Penalty (40%) - Pengurangan per anomali
    anomaly_count = analytics_data["anomaly"]["detected_count"]
    # Penalty: 8 poin per anomali, max 40 poin. (Increased to match 40% weight better)
    anomaly_penalty = min(40, anomaly_count * 8)
    anomaly_score = 40 - anomaly_penalty

    # Final Score
    total_score = (stability_score * 0.3) + (utilization_score * 0.3) + (anomaly_score)

    res = {
        "total_score": round(total_score, 2),
        "components": {
            "stability": round(stability_score, 2),
            "utilization": round(utilization_score, 2),
            "anomaly_penalty": -anomaly_penalty,
            "anomaly_score": round(anomaly_score, 2),
        },
        "metadata": {
            "is_low_confidence": (
                trend_data.get("metadata", {}).get("accuracy_pct", 100) < 100
            ),
            "accuracy_pct": trend_data.get("metadata", {}).get("accuracy_pct", 100),
        },
    }

    PIPELINE_STAGE_LATENCY.labels(stage_name="stage6_scoring").observe(
        time.time() - start_ts
    )
    return res


async def generate_insights(
    trend_data: Dict[str, Any],
    analytics_data: Dict[str, Any],
    health_score: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Stage 7: Insights Engine.
    Menghasilkan wawasan kualitatif dan rekomendasi berdasarkan data analisis.
    """
    logger.info("[STAGE 7] Generating qualitative insights")
    start_ts = time.time()
    insights = []

    # Common Metadata for traceability V2.1
    metadata = {
        "source_id": analytics_data.get("metadata", {}).get(
            "source_id", "SystemEngine"
        ),
        "accuracy_pct": health_score.get("metadata", {}).get("accuracy_pct", 100),
        "is_low_confidence": health_score.get("metadata", {}).get(
            "is_low_confidence", False
        ),
        "raw_timestamp": datetime.now().isoformat(),
    }

    # 1. Health Insight
    score = health_score["total_score"]
    if score >= 85:
        insights.append(
            {
                "type": "health",
                "level": "SUCCESS",
                "title": "Kesehatan Sistem Sangat Baik",
                "message": f"Sistem beroperasi dengan optimal (Skor: {score}). Tidak diperlukan tindakan segera.",
                "link": "#health-section",
                **metadata,
            }
        )
    elif score >= 60:
        insights.append(
            {
                "type": "health",
                "level": "WARNING",
                "title": "Kesehatan Sistem Menurun",
                "message": f"Sistem menunjukkan tanda-tanda degradasi (Skor: {score}). Perlu pemantauan lebih lanjut.",
                "link": "#health-section",
                **metadata,
            }
        )
    else:
        insights.append(
            {
                "type": "health",
                "level": "CRITICAL",
                "title": "Kesehatan Sistem Kritis",
                "message": f"Ditemukan masalah serius pada sistem (Skor: {score}). Segera lakukan audit infrastruktur.",
                "link": "#health-section",
                **metadata,
            }
        )

    # 2. Traffic & Stability Insight
    stability = health_score["components"]["stability"]
    if stability < 40:
        insights.append(
            {
                "type": "traffic",
                "level": "HIGH",
                "title": "Stabilitas Traffic Rendah",
                "message": "Terdeteksi fluktuasi traffic yang sangat tinggi dalam periode pengamatan.",
                "link": "#trend-section",
                **metadata,
            }
        )

    # 3. Anomaly Insight
    anomaly_count = analytics_data["anomaly"]["detected_count"]
    if anomaly_count > 0:
        insights.append(
            {
                "type": "anomaly",
                "level": "CRITICAL" if anomaly_count > 5 else "WARNING",
                "title": f"{anomaly_count} Anomali Terdeteksi",
                "message": f"Ditemukan {anomaly_count} titik data yang menyimpang secara statistik (Z-Score > 2.0).",
                "link": "#anomaly-section",
                **metadata,
            }
        )

    # 4. Resource Insight
    avg_cpu = trend_data["summary"]["resource"]["cpu"]["avg"]
    if avg_cpu > 70:
        insights.append(
            {
                "type": "resource",
                "level": "CRITICAL",
                "title": "Beban CPU Tinggi",
                "message": f"Rata-rata penggunaan CPU ({avg_cpu:.1f}%) telah melampaui batas ambang aman 70%.",
                "link": "#trend-section",
                **metadata,
            }
        )
    elif avg_cpu > 50:
        insights.append(
            {
                "type": "resource",
                "level": "WARNING",
                "title": "Beban CPU Meningkat",
                "message": f"Penggunaan CPU ({avg_cpu:.1f}%) berada di zona waspada. Perhatikan skalabilitas.",
                "link": "#trend-section",
                **metadata,
            }
        )

    # 4.1 User Layer Insight (V2.4.1 Added)
    avg_users = trend_data["summary"]["users"]["total_avg"]
    max_users = trend_data["summary"]["users"]["hotspot"]["max"] + trend_data["summary"]["users"]["pppoe"]["max"]
    if avg_users > 0:
        insights.append(
            {
                "type": "users",
                "level": "INFO",
                "title": "Analisis Pengguna Aktif",
                "message": f"Rata-rata {avg_users:.0f} pengguna aktif (Peak: {max_users:.0f}). Gunakan data ini untuk perencanaan kapasitas.",
                "link": "#trend-section",
                **metadata,
            }
        )

    # 5. Habit/Peak Hour Insight
    if analytics_data["habit"]["peak_hours"]:
        top_hour = analytics_data["habit"]["peak_hours"][0]["hour"]
        insights.append(
            {
                "type": "habit",
                "level": "INFO",
                "title": "Jam Sibuk Teridentifikasi",
                "message": f"Traffic puncak biasanya terjadi pada jam {top_hour:02d}:00.",
                "link": "#habit-section",
                **metadata,
            }
        )

    PIPELINE_STAGE_LATENCY.labels(stage_name="stage7_insight").observe(
        time.time() - start_ts
    )
    return insights


async def get_heavy_analysis(
    db: AsyncSession,
    board_id: UUID,
    days: int = 30,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "day",
) -> Dict[str, Any]:
    """
    Melakukan agregasi berat di sisi database menggunakan SQL.
    Mencakup: P95/P99 Traffic, Forecasting, Anomaly Detection (Z-Score), dan Korelasi.
    """
    if not start_time:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
    else:
        # If start_time is provided, we use it. If end_time is not, we use now.
        if not end_time:
            end_time = datetime.now()
        # Update days for mid_date calculation if needed
        days = (end_time - start_time).days or 30

    # Determine final granularity
    granularity = _determine_time_granularity(start_time, end_time, granularity)

    # 0. Check if board exists
    board_check = await db.execute(
        text("SELECT board_id FROM mikrotik_boards WHERE board_id = :board_id"),
        {"board_id": board_id},
    )
    if not board_check.fetchone():
        raise ValueError(f"Board with ID {board_id} not found")

    # 1. Traffic Percentiles (P95, P99) and Max
    percentile_query = text("""
        SELECT
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY download_mbps::float8) as p95_dl,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY download_mbps::float8) as p99_dl,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY upload_mbps::float8) as p95_ul,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY upload_mbps::float8) as p99_ul,
            max(download_mbps) as max_dl,
            max(upload_mbps) as max_ul,
            (SELECT log_time FROM board_speed_stats WHERE board_id = :board_id
             AND download_mbps = (SELECT max(download_mbps) FROM board_speed_stats
                                 WHERE board_id = :board_id AND log_time >= :start_time AND log_time < :end_time)
             AND log_time >= :start_time AND log_time < :end_time LIMIT 1) as max_dl_date,
            (SELECT log_time FROM board_speed_stats WHERE board_id = :board_id
             AND upload_mbps = (SELECT max(upload_mbps) FROM board_speed_stats
                               WHERE board_id = :board_id AND log_time >= :start_time AND log_time < :end_time)
             AND log_time >= :start_time AND log_time < :end_time LIMIT 1) as max_ul_date
        FROM board_speed_stats
        WHERE board_id = :board_id AND log_time >= :start_time AND log_time < :end_time
    """)

    # 2. Forecasting (Linear Regression Slope/Intercept)
    # Gunakan date_trunc untuk data mentah jika granularity < day
    # Jika granularity >= day, gunakan board_daily_summary untuk kecepatan
    if granularity in ["hour", "minute"]:
        forecast_query = text("""
            WITH raw_agg AS (
                SELECT
                    date_trunc(:granularity, log_time) as period,
                    avg(download_mbps) as avg_dl
                FROM board_speed_stats
                WHERE board_id = :board_id AND log_time >= :start_time AND log_time < :end_time
                GROUP BY period
            )
            SELECT
                regr_slope(avg_dl::float8, extract(epoch from period)::float8) as slope,
                regr_intercept(avg_dl::float8, extract(epoch from period)::float8) as intercept,
                0 as cpu_slope, 0 as cpu_intercept, 0 as mem_slope, 0 as mem_intercept
            FROM raw_agg
        """)
    elif granularity in ["week", "month"]:
        forecast_query = text("""
            WITH daily_agg AS (
                SELECT
                    date_trunc(:granularity, log_date) as period,
                    avg(avg_download) as avg_dl,
                    avg(avg_cpu_load) as avg_cpu,
                    avg(min_free_memory) as avg_mem
                FROM board_daily_summary
                WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date
                GROUP BY period
            )
            SELECT
                regr_slope(avg_dl::float8, extract(epoch from period)::float8) as slope,
                regr_intercept(avg_dl::float8, extract(epoch from period)::float8) as intercept,
                regr_slope(avg_cpu::float8, extract(epoch from period)::float8) as cpu_slope,
                regr_intercept(avg_cpu::float8, extract(epoch from period)::float8) as cpu_intercept,
                regr_slope(avg_mem::float8, extract(epoch from period)::float8) as mem_slope,
                regr_intercept(avg_mem::float8, extract(epoch from period)::float8) as mem_intercept
            FROM daily_agg
        """)
    else:
        forecast_query = text("""
            SELECT
                regr_slope(avg_download::float8, extract(epoch from log_date)::float8) as slope,
                regr_intercept(avg_download::float8, extract(epoch from log_date)::float8) as intercept,
                regr_slope(avg_cpu_load::float8, extract(epoch from log_date)::float8) as cpu_slope,
                regr_intercept(avg_cpu_load::float8, extract(epoch from log_date)::float8) as cpu_intercept,
                regr_slope(min_free_memory::float8, extract(epoch from log_date)::float8) as mem_slope,
                regr_intercept(min_free_memory::float8, extract(epoch from log_date)::float8) as mem_intercept
            FROM board_daily_summary
            WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date
        """)

    # 3. Anomaly Detection (Z-Score)
    if granularity in ["hour", "minute"]:
        anomaly_query = text("""
            WITH raw_data AS (
                SELECT
                    date_trunc(:granularity, log_time) as period,
                    avg(download_mbps) as avg_dl
                FROM board_speed_stats
                WHERE board_id = :board_id AND log_time >= :start_time AND log_time < :end_time
                GROUP BY period
            ),
            stats AS (
                SELECT
                    avg(avg_dl::float8) as mean_dl,
                    stddev(avg_dl::float8) as std_dl
                FROM raw_data
            )
            SELECT
                period as log_date, avg_dl as avg_download,
                (avg_dl::float8 - stats.mean_dl) / NULLIF(stats.std_dl, 0) as z_score_dl,
                0 as avg_cpu_load, 0 as z_score_cpu, 0 as min_free_memory, 0 as z_score_mem
            FROM raw_data, stats
            WHERE abs((avg_dl::float8 - stats.mean_dl) / NULLIF(stats.std_dl, 0)) > 2.0
            ORDER BY period DESC
        """)
    elif granularity in ["week", "month"]:
        anomaly_query = text("""
            WITH grouped_data AS (
                SELECT
                    date_trunc(:granularity, log_date) as period,
                    avg(avg_download) as avg_dl,
                    avg(avg_cpu_load) as avg_cpu,
                    avg(min_free_memory) as avg_mem
                FROM board_daily_summary
                WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date
                GROUP BY period
            ),
            stats AS (
                SELECT
                    avg(avg_dl::float8) as mean_dl,
                    stddev(avg_dl::float8) as std_dl,
                    avg(avg_cpu::float8) as mean_cpu,
                    stddev(avg_cpu::float8) as std_cpu,
                    avg(avg_mem::float8) as mean_mem,
                    stddev(avg_mem::float8) as std_mem
                FROM grouped_data
            )
            SELECT
                period as log_date, avg_dl as avg_download,
                (avg_dl::float8 - stats.mean_dl) / NULLIF(stats.std_dl, 0) as z_score_dl,
                avg_cpu as avg_cpu_load,
                (avg_cpu::float8 - stats.mean_cpu) / NULLIF(stats.std_cpu, 0) as z_score_cpu,
                avg_mem as min_free_memory,
                (avg_mem::float8 - stats.mean_mem) / NULLIF(stats.std_mem, 0) as z_score_mem
            FROM grouped_data, stats
            WHERE (
                abs((avg_dl::float8 - stats.mean_dl) / NULLIF(stats.std_dl, 0)) > 2.0
                OR abs((avg_cpu::float8 - stats.mean_cpu) / NULLIF(stats.std_cpu, 0)) > 2.0
                OR abs((avg_mem::float8 - stats.mean_mem) / NULLIF(stats.std_mem, 0)) > 2.0
            )
            ORDER BY period DESC
        """)
    else:
        anomaly_query = text("""
            WITH stats AS (
                SELECT
                    avg(avg_download::float8) as mean_dl,
                    stddev(avg_download::float8) as std_dl,
                    avg(avg_cpu_load::float8) as mean_cpu,
                    stddev(avg_cpu_load::float8) as std_cpu,
                    avg(min_free_memory::float8) as mean_mem,
                    stddev(min_free_memory::float8) as std_mem
                FROM board_daily_summary
                WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date
            )
            SELECT
                log_date, avg_download,
                (avg_download::float8 - stats.mean_dl) / NULLIF(stats.std_dl, 0) as z_score_dl,
                avg_cpu_load,
                (avg_cpu_load::float8 - stats.mean_cpu) / NULLIF(stats.std_cpu, 0) as z_score_cpu,
                min_free_memory,
                (min_free_memory::float8 - stats.mean_mem) / NULLIF(stats.std_mem, 0) as z_score_mem
            FROM board_daily_summary, stats
            WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date
            AND (
                abs((avg_download::float8 - stats.mean_dl) / NULLIF(stats.std_dl, 0)) > 2.0
                OR abs((avg_cpu_load::float8 - stats.mean_cpu) / NULLIF(stats.std_cpu, 0)) > 2.0
                OR abs((min_free_memory::float8 - stats.mean_mem) / NULLIF(stats.std_mem, 0)) > 2.0
            )
            ORDER BY log_date DESC
        """)

    # 4. Correlation (Pearson)
    correlation_query = text("""
        SELECT
            corr(cpu.cpu_load::float8, speed.download_mbps::float8) as pearson_r,
            count(*) as sample_size
        FROM board_resource_stats cpu
        JOIN board_speed_stats speed ON cpu.board_id = speed.board_id
            AND date_trunc('minute', cpu.log_time) = date_trunc('minute', speed.log_time)
        WHERE cpu.board_id = :board_id AND cpu.log_time >= :start_time AND cpu.log_time < :end_time
    """)

    # 5. Health Score Calculation Components
    health_query = text("""
        SELECT
            avg(avg_cpu_load) as avg_cpu,
            max(max_cpu_load) as peak_cpu,
            avg(min_free_memory) as avg_mem,
            count(*) filter (where avg_cpu_load > 80 or min_free_memory < 104857600) as resource_alerts,
            stddev(avg_cpu_load) as cpu_std,
            stddev(min_free_memory) as mem_std
        FROM board_daily_summary
        WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date
    """)

    # 6. Top Growth Users
    growth_query = text("""
        WITH daily_usage AS (
            SELECT
                COALESCE(pppoe_username, hotspot_username, interface_name) as username,
                log_date,
                sum(rx_bytes + tx_bytes) as total_bytes
            FROM (
                SELECT pppoe_username, NULL as hotspot_username, NULL as interface_name, log_date,
                       download_bytes as rx_bytes, upload_bytes as tx_bytes
                FROM board_pppoe_usage
                WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date

                UNION ALL

                SELECT NULL, username as hotspot_username, NULL, log_date,
                       daily_download as rx_bytes, daily_upload as tx_bytes
                FROM hotspot_usage_raw
                WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date

                UNION ALL

                SELECT NULL, NULL, interface_name, log_date,
                       total_rx_bytes as rx_bytes, total_tx_bytes as tx_bytes
                FROM board_interface_usage
                WHERE board_id = :board_id AND log_date >= :start_time::date AND log_date <= :end_time::date
            ) combined
            GROUP BY username, log_date
        ),
        period_avg AS (
            SELECT
                username,
                avg(total_bytes) filter (where log_date < :mid_date) as prev_avg,
                avg(total_bytes) filter (where log_date >= :mid_date) as curr_avg
            FROM daily_usage
            GROUP BY username
        )
        SELECT username, prev_avg, curr_avg,
               ((COALESCE(curr_avg, 0) - COALESCE(prev_avg, 0)) / NULLIF(COALESCE(prev_avg, 0), 0)) * 100 as growth_pct
        FROM period_avg
        WHERE prev_avg > 0
        ORDER BY growth_pct DESC
        LIMIT 5
    """)

    try:
        mid_date = (start_time + (end_time - start_time) / 2).date()
        params = {
            "board_id": board_id,
            "start_time": start_time,
            "end_time": end_time,
            "granularity": granularity,
        }

        # Execute all
        p_res = await db.execute(percentile_query, params)
        f_res = await db.execute(forecast_query, params)
        a_res = await db.execute(anomaly_query, params)
        c_res = await db.execute(correlation_query, params)
        h_res = await db.execute(health_query, params)
        g_res = await db.execute(growth_query, {**params, "mid_date": mid_date})

        p_row = p_res.fetchone()
        f_row = f_res.fetchone()
        a_rows = a_res.fetchall()
        c_row = c_res.fetchone()
        h_row = h_res.fetchone()
        g_rows = g_res.fetchall()

        # Handle empty results to avoid "None is not subscriptable"
        res_percentiles = {
            "p95_dl": 0,
            "p99_dl": 0,
            "p95_ul": 0,
            "p99_ul": 0,
            "max_dl": 0,
            "max_ul": 0,
            "max_dl_date": None,
            "max_ul_date": None,
        }
        if p_row:
            res_percentiles = {
                "p95_dl": float(p_row[0] or 0),
                "p99_dl": float(p_row[1] or 0),
                "p95_ul": float(p_row[2] or 0),
                "p99_ul": float(p_row[3] or 0),
                "max_dl": float(p_row[4] or 0),
                "max_ul": float(p_row[5] or 0),
                "max_dl_date": str(p_row[6]) if p_row[6] else None,
                "max_ul_date": str(p_row[7]) if p_row[7] else None,
            }

        res_forecast = {
            "traffic": {"slope": 0, "intercept": 0},
            "cpu": {"slope": 0, "intercept": 0},
            "memory": {"slope": 0, "intercept": 0},
            "target_date_epoch": (datetime.now() + timedelta(days=7)).timestamp(),
        }
        if f_row:
            res_forecast["traffic"] = {
                "slope": float(f_row[0] or 0),
                "intercept": float(f_row[1] or 0),
            }
            res_forecast["cpu"] = {
                "slope": float(f_row[2] or 0),
                "intercept": float(f_row[3] or 0),
            }
            res_forecast["memory"] = {
                "slope": float(f_row[4] or 0),
                "intercept": float(f_row[5] or 0),
            }

        res_correlation = {"pearson_r": 0, "sample_size": 0}
        if c_row:
            res_correlation = {
                "pearson_r": float(c_row[0] or 0),
                "sample_size": int(c_row[1] or 0),
            }

        res_health = {
            "avg_cpu": 0,
            "peak_cpu": 0,
            "avg_mem": 0,
            "resource_alerts": 0,
            "cpu_std": 0,
            "mem_std": 0,
            "cpu_usage": 0,
            "mem_usage": 0,
            "cpu_p": 0,
        }
        if h_row:
            res_health = {
                "avg_cpu": float(h_row[0] or 0),
                "peak_cpu": float(h_row[1] or 0),
                "avg_mem": float(h_row[2] or 0),
                "resource_alerts": int(h_row[3] or 0),
                "cpu_std": float(h_row[4] or 0),
                "mem_std": float(h_row[5] or 0),
                "cpu_usage": float(h_row[0] or 0),
                "mem_usage": float(h_row[2] or 0),
                "cpu_p": float(h_row[1] or 0),
            }

        return {
            "actual_granularity": granularity,
            "percentiles": res_percentiles,
            "forecast": res_forecast,
            "anomalies": [
                {
                    "date": str(row[0]) if row[0] else "",
                    "traffic_value": float(row[1] or 0),
                    "traffic_z_score": float(row[2] or 0),
                    "cpu_value": float(row[3] or 0),
                    "cpu_usage": float(row[3] or 0),
                    "cpu_z_score": float(row[4] or 0),
                    "mem_value": float(row[5] or 0),
                    "mem_usage": float(row[5] or 0),
                    "mem_z_score": float(row[6] or 0),
                }
                for row in a_rows
            ],
            "correlation": res_correlation,
            "health_stats": res_health,
            "top_growth_users": [
                {
                    "name": row[0],
                    "growth": float(row[3] or 0),
                    "current_usage": float(row[2] or 0),
                }
                for row in g_rows
            ],
        }
    except Exception as e:
        logger.error(f"Error in heavy analysis: {e}")
        return {}


async def get_dashboard_summary(db: AsyncSession, board_id: UUID) -> Dict[str, Any]:
    """
    Agregasi cepat untuk dashboard summary (KPI Cards)
    """
    # Sum total bytes today
    stmt = select(
        func.sum(BoardInterfaceUsage.total_rx_bytes).label("total_rx"),
        func.sum(BoardInterfaceUsage.total_tx_bytes).label("total_tx"),
    ).where(
        and_(
            BoardInterfaceUsage.board_id == board_id,
            BoardInterfaceUsage.log_date == date.today(),
        )
    )

    res = await db.execute(stmt)
    row = res.fetchone()

    # Handle empty results to avoid "None is not subscriptable"
    rx = 0
    tx = 0
    if row:
        rx = int(row[0] or 0)
        tx = int(row[1] or 0)

    # Get latest resource usage
    res_stmt = (
        select(BoardResourceStat.cpu_load, BoardResourceStat.free_memory)
        .where(BoardResourceStat.board_id == board_id)
        .order_by(BoardResourceStat.log_time.desc())
        .limit(1)
    )

    res_res = await db.execute(res_stmt)
    res_row = res_res.fetchone()

    cpu = 0
    mem = 0
    if res_row:
        cpu = int(res_row[0] or 0)
        mem = int(res_row[1] or 0)

    return {
        "today_traffic": {"rx": rx, "tx": tx},
        "today_resource": {
            "cpu": cpu,
            "cpu_usage": cpu,
            "cpu_p": cpu,
            "memory": mem,
            "mem_usage": mem,
        },
    }


async def get_interface_pivot(
    db: AsyncSession,
    board_id: UUID,
    days: int = 30,
    pivot_agg: str = "sum",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "day",
) -> List[Dict[str, Any]]:
    """
    Mengambil data pivot per interface (Total Download/Upload per interface).
    Menggunakan BoardSpeedStat untuk fleksibilitas granularity jika diperlukan,
    tapi default tetap menggunakan Daily Summary untuk performa.
    """
    if not start_time:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
    if not end_time:
        end_time = datetime.now()

    granularity = _determine_time_granularity(start_time, end_time, granularity)

    # Pilih model dan kolom berdasarkan granularity
    if granularity in ["hour", "minute"]:
        # Jika granularity halus, kita harus hitung dari data raw
        filters = [
            BoardSpeedStat.board_id == board_id,
            BoardSpeedStat.log_time >= start_time,
        ]
        if end_time:
            filters.append(BoardSpeedStat.log_time < end_time)

        agg_func = func.sum
        if pivot_agg == "max":
            agg_func = func.max
        elif pivot_agg == "avg":
            agg_func = func.avg

        # Note: BoardSpeedStat mungkin tidak punya interface_name di level raw
        # jika itu speed test global. Namun model BoardInterfaceUsage punya data per interface.
        # Kita gunakan BoardInterfaceUsage (raw/hampir raw) untuk granularity halus.
        stmt = (
            select(
                BoardInterfaceUsage.interface_name,
                agg_func(BoardInterfaceUsage.total_rx_bytes).label("dl_val"),
                agg_func(BoardInterfaceUsage.total_tx_bytes).label("ul_val"),
            )
            .where(
                and_(
                    BoardInterfaceUsage.board_id == board_id,
                    BoardInterfaceUsage.log_date >= start_time.date(),
                    BoardInterfaceUsage.log_date <= end_time.date(),
                )
            )
            .group_by(BoardInterfaceUsage.interface_name)
            .order_by(text("dl_val DESC"))
        )
    else:
        # Default: gunakan Daily Summary (sangat cepat)
        filters = [
            BoardInterfaceDailySummary.board_id == board_id,
            BoardInterfaceDailySummary.log_date >= start_time.date(),
        ]
        if end_time:
            filters.append(BoardInterfaceDailySummary.log_date <= end_time.date())

        agg_func = func.sum
        if pivot_agg == "max":
            agg_func = func.max
        elif pivot_agg == "avg":
            agg_func = func.avg

        stmt = (
            select(
                BoardInterfaceDailySummary.interface_name,
                agg_func(BoardInterfaceDailySummary.avg_download_mbps).label("dl_val"),
                agg_func(BoardInterfaceDailySummary.avg_upload_mbps).label("ul_val"),
            )
            .where(and_(*filters))
            .group_by(BoardInterfaceDailySummary.interface_name)
            .order_by(text("dl_val DESC"))
        )

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "name": row.interface_name,
            "dl": float(row.dl_val or 0),
            "ul": float(row.ul_val or 0),
            "tot": float((row.dl_val or 0) + (row.ul_val or 0)),
        }
        for row in rows
    ]


async def get_interface_analysis(
    db: AsyncSession,
    board_id: UUID,
    days: int = 30,
    pivot_agg: str = "sum",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "day",
) -> List[Dict[str, Any]]:
    """
    Mengambil analisis per-interface dari data agregat.
    """
    if not start_time:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
    if not end_time:
        end_time = datetime.now()

    # Untuk analisis detail, kita selalu gunakan Daily Summary jika granularity >= day
    # karena data p95/max sudah tersedia di sana.
    filters = [
        BoardInterfaceDailySummary.board_id == board_id,
        BoardInterfaceDailySummary.log_date >= start_time.date(),
    ]
    if end_time:
        filters.append(BoardInterfaceDailySummary.log_date <= end_time.date())

    # Pilih fungsi agregasi berdasarkan pivot_agg
    agg_func = func.sum
    if pivot_agg == "max":
        agg_func = func.max
    elif pivot_agg == "avg":
        agg_func = func.avg

    stmt = (
        select(
            BoardInterfaceDailySummary.interface_name,
            agg_func(BoardInterfaceDailySummary.avg_download_mbps).label("dl_val"),
            agg_func(BoardInterfaceDailySummary.avg_upload_mbps).label("ul_val"),
            func.max(BoardInterfaceDailySummary.p95_download_mbps).label("p95_dl"),
            func.avg(BoardInterfaceDailySummary.avg_download_mbps).label("avg_dl"),
            func.max(BoardInterfaceDailySummary.max_download_mbps).label("max_dl"),
        )
        .where(and_(*filters))
        .group_by(BoardInterfaceDailySummary.interface_name)
        .order_by(text("dl_val DESC"))
    )

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "interface": row.interface_name,
            "download_value": float(row.dl_val or 0),
            "upload_value": float(row.ul_val or 0),
            "p95_download": float(row.p95_dl or 0),
            "avg_download": float(row.avg_dl or 0),
            "max_download": float(row.max_dl or 0),
            "utilization_score": float((row.p95_dl or 0) / 100),
        }
        for row in rows
    ]


async def get_pppoe_pivot(
    db: AsyncSession,
    board_id: UUID,
    days: int = 30,
    pivot_agg: str = "sum",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "day",
) -> List[Dict[str, Any]]:
    """
    Mengambil data pivot per user PPPoE.
    """
    if not start_time:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
    if not end_time:
        end_time = datetime.now()

    granularity = _determine_time_granularity(start_time, end_time, granularity)

    filters = [
        BoardPppoeUsage.board_id == board_id,
        BoardPppoeUsage.log_date >= start_time.date(),
    ]
    if end_time:
        filters.append(BoardPppoeUsage.log_date <= end_time.date())

    agg_func = func.sum
    if pivot_agg == "max":
        agg_func = func.max
    elif pivot_agg == "avg":
        agg_func = func.avg

    stmt = (
        select(
            BoardPppoeUsage.pppoe_username,
            agg_func(BoardPppoeUsage.download_bytes).label("dl_bytes"),
            agg_func(BoardPppoeUsage.upload_bytes).label("ul_bytes"),
        )
        .where(and_(*filters))
        .group_by(BoardPppoeUsage.pppoe_username)
        .order_by(text("dl_bytes DESC"))
    )

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "name": row.pppoe_username,
            "dl": int(row.dl_bytes or 0),
            "ul": int(row.ul_bytes or 0),
            "tot": int((row.dl_bytes or 0) + (row.ul_bytes or 0)),
        }
        for row in rows
    ]


async def get_hotspot_pivot(
    db: AsyncSession,
    board_id: UUID,
    days: int = 30,
    pivot_agg: str = "sum",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "day",
) -> List[Dict[str, Any]]:
    """
    Mengambil data pivot per user Hotspot.
    """
    if not start_time:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
    if not end_time:
        end_time = datetime.now()

    granularity = _determine_time_granularity(start_time, end_time, granularity)

    filters = [
        HotspotUsageRaw.board_id == board_id,
        HotspotUsageRaw.log_date >= start_time.date(),
    ]
    if end_time:
        filters.append(HotspotUsageRaw.log_date <= end_time.date())

    agg_func = func.sum
    if pivot_agg == "max":
        agg_func = func.max
    elif pivot_agg == "avg":
        agg_func = func.avg

    stmt = (
        select(
            HotspotUsageRaw.username,
            agg_func(HotspotUsageRaw.daily_download).label("dl_bytes"),
            agg_func(HotspotUsageRaw.daily_upload).label("ul_bytes"),
        )
        .where(and_(*filters))
        .group_by(HotspotUsageRaw.username)
        .order_by(text("dl_bytes DESC"))
    )

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "name": row.username,
            "dl": int(row.dl_bytes or 0),
            "ul": int(row.ul_bytes or 0),
            "tot": int((row.dl_bytes or 0) + (row.ul_bytes or 0)),
        }
        for row in rows
    ]


async def get_pppoe_analysis(
    db: AsyncSession,
    board_id: UUID,
    days: int = 30,
    pivot_agg: str = "sum",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "day",
) -> List[Dict[str, Any]]:
    """
    Mengambil analisis per-user PPPoE dari data agregat.
    """
    if not start_time:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
    if not end_time:
        end_time = datetime.now()

    granularity = _determine_time_granularity(start_time, end_time, granularity)

    filters = [
        BoardPppoeUsage.board_id == board_id,
        BoardPppoeUsage.log_date >= start_time.date(),
    ]
    if end_time:
        filters.append(BoardPppoeUsage.log_date <= end_time.date())

    agg_func = func.sum
    if pivot_agg == "max":
        agg_func = func.max
    elif pivot_agg == "avg":
        agg_func = func.avg

    stmt = (
        select(
            BoardPppoeUsage.pppoe_username,
            agg_func(BoardPppoeUsage.download_bytes).label("dl_bytes"),
            agg_func(BoardPppoeUsage.upload_bytes).label("ul_bytes"),
            func.count(BoardPppoeUsage.log_date).label("active_days"),
        )
        .where(and_(*filters))
        .group_by(BoardPppoeUsage.pppoe_username)
        .order_by(text("dl_bytes DESC"))
    )

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "username": row.pppoe_username,
            "download_value": int(row.dl_bytes or 0),
            "upload_value": int(row.ul_bytes or 0),
            "active_days": int(row.active_days or 0),
            "avg_daily_usage": float((row.dl_bytes or 0) / (row.active_days or 1)),
        }
        for row in rows
    ]


async def get_hotspot_analysis(
    db: AsyncSession,
    board_id: UUID,
    days: int = 30,
    pivot_agg: str = "sum",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "day",
) -> List[Dict[str, Any]]:
    """
    Mengambil analisis per-user Hotspot dari data agregat.
    """
    if not start_time:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
    if not end_time:
        end_time = datetime.now()

    filters = [
        HotspotUsageRaw.board_id == board_id,
        HotspotUsageRaw.log_date >= start_time.date(),
    ]
    if end_time:
        filters.append(HotspotUsageRaw.log_date <= end_time.date())

    agg_func = func.sum
    if pivot_agg == "max":
        agg_func = func.max
    elif pivot_agg == "avg":
        agg_func = func.avg

    stmt = (
        select(
            HotspotUsageRaw.username,
            agg_func(HotspotUsageRaw.daily_download).label("dl_bytes"),
            agg_func(HotspotUsageRaw.daily_upload).label("ul_bytes"),
            func.count(HotspotUsageRaw.log_date).label("active_days"),
        )
        .where(and_(*filters))
        .group_by(HotspotUsageRaw.username)
        .order_by(text("dl_bytes DESC"))
    )

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "username": row.username,
            "download_value": int(row.dl_bytes or 0),
            "upload_value": int(row.ul_bytes or 0),
            "active_days": int(row.active_days or 0),
            "avg_daily_usage": float((row.dl_bytes or 0) / (row.active_days or 1)),
        }
        for row in rows
    ]


async def get_clients_analysis(
    db: AsyncSession,
    board_id: UUID,
    days: int = 30,
    pivot_agg: str = "max",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = "day",
) -> List[Dict[str, Any]]:
    """
    Mengambil data jumlah client (PPPoE & Hotspot) dengan granularity.
    """
    if not start_time:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
    if not end_time:
        end_time = datetime.now()

    granularity = _determine_time_granularity(start_time, end_time, granularity)

    # Mapping aggregation function
    agg_func = func.max
    if pivot_agg == "avg":
        agg_func = func.avg

    # Jika granularity halus, ambil dari BoardClientStat (raw per log_time)
    if granularity in ["hour", "minute"]:
        stmt = (
            select(
                func.date_trunc(granularity, BoardClientStat.log_time).label("period"),
                agg_func(BoardClientStat.total_pppoe).label("pppoe"),
                agg_func(BoardClientStat.total_hotspot).label("hotspot"),
            )
            .where(
                and_(
                    BoardClientStat.board_id == board_id,
                    BoardClientStat.log_time >= start_time,
                    BoardClientStat.log_time < end_time,
                )
            )
            .group_by(text("period"))
            .order_by(text("period ASC"))
        )
    else:
        # Default: gunakan Daily Summary (BoardDailySummary)
        stmt = (
            select(
                BoardDailySummary.log_date.label("period"),
                BoardDailySummary.max_pppoe_users.label("pppoe"),
                BoardDailySummary.max_hotspot_users.label("hotspot"),
            )
            .where(
                and_(
                    BoardDailySummary.board_id == board_id,
                    BoardDailySummary.log_date >= start_time.date(),
                    BoardDailySummary.log_date <= end_time.date(),
                )
            )
            .order_by(BoardDailySummary.log_date.asc())
        )

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "date": str(row.period),
            "pppoe_active": int(row.pppoe or 0),
            "hotspot_active": int(row.hotspot or 0),
            "total_active": int((row.pppoe or 0) + (row.hotspot or 0)),
        }
        for row in rows
    ]


async def get_interface_forecast(
    db: AsyncSession,
    board_id: UUID,
    interface_name: str,
    days: int = 30,
    start_time: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Melakukan forecasting khusus untuk satu interface.
    """
    if not start_time:
        start_time = datetime.now() - timedelta(days=days)

    forecast_query = text("""
        SELECT
            regr_slope(avg_download_mbps, extract(epoch from log_date)) as slope,
            regr_intercept(avg_download_mbps, extract(epoch from log_date)) as intercept,
            regr_slope(p95_download_mbps, extract(epoch from log_date)) as p95_slope,
            regr_intercept(p95_download_mbps, extract(epoch from log_date)) as p95_intercept
        FROM board_interface_daily_summary
        WHERE board_id = :board_id
        AND interface_name = :interface_name
        AND log_date >= :start_time::date
    """)

    res = await db.execute(
        forecast_query,
        {
            "board_id": board_id,
            "interface_name": interface_name,
            "start_time": start_time,
        },
    )
    row = res.fetchone()

    if not row or row[0] is None:
        return {"slope": 0, "intercept": 0, "p95_slope": 0, "p95_intercept": 0}

    return {
        "slope": float(row[0] or 0),
        "intercept": float(row[1] or 0),
        "p95_slope": float(row[2] or 0),
        "p95_intercept": float(row[3] or 0),
        "target_date_epoch": (datetime.now() + timedelta(days=7)).timestamp(),
    }
