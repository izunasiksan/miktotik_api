from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract, text, Numeric, cast
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID
import logging

from app.models.mikrotik import (
    BoardDailySummary, BoardResourceStat, BoardSpeedStat, 
    BoardClientStat, BoardInterfaceUsage, BoardPppoeUsage, HotspotUsageRaw,
    BoardInterfaceDailySummary
)

logger = logging.getLogger(__name__)

def _determine_granularity(start_date: Optional[date], end_date: Optional[date], requested: str) -> str:
    if requested != 'auto':
        return requested
    
    if not start_date or not end_date:
        return 'day'
    days = (end_date - start_date).days
    if days <= 1:
        return 'hour'
    if days <= 31:
        return 'day'
    if days <= 365:
        return 'week'
    return 'month'

def _determine_time_granularity(start_dt: datetime, end_dt: datetime, requested: str) -> str:
    if requested != 'auto':
        return requested
    delta = end_dt - start_dt
    days = delta.days
    if days >= 365 * 2:
        return 'year'
    if days >= 60:
        return 'month'
    if days >= 2:
        return 'day'
    return 'hour'

async def time_aggregate(
    db: "AsyncSession",
    board_id: "UUID",
    metric: str = 'download_mbps',
    agg: str = 'avg',
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    granularity: str = 'auto'
) -> list[dict]:
    """
    Agregasi berbasis waktu dengan dukungan granularitas: year, month, day, hour, auto.
    Mendukung fungsi agregasi: sum, avg, count, min, max.
    """
    from sqlalchemy import text
    if start_time is None or end_time is None:
        raise ValueError("start_time dan end_time wajib diisi")
    if end_time <= start_time:
        raise ValueError("end_time harus lebih besar dari start_time")
    
    # Normalisasi granularity
    granularity = _determine_time_granularity(start_time, end_time, granularity)
    if granularity not in ['year', 'month', 'day', 'hour']:
        raise ValueError("granularity harus salah satu dari: year, month, day, hour, auto")
    
    # Validasi metric dan mapping ke tabel/kolom
    metric = str(metric).lower()
    agg = str(agg).lower()
    allowed_aggs = {'sum', 'avg', 'count', 'min', 'max'}
    if agg not in allowed_aggs:
        raise ValueError("agg harus salah satu dari: sum, avg, count, min, max")
    
    # Map metric -> (table, column, time_col)
    # Catatan: gunakan tabel raw untuk fleksibilitas (jam/hari/bulan/tahun via date_trunc)
    metric_map = {
        'download_mbps': ('board_speed_stats', 'download_mbps', 'log_time'),
        'upload_mbps': ('board_speed_stats', 'upload_mbps', 'log_time'),
        'cpu_load': ('board_resource_stats', 'cpu_load', 'log_time'),
        'free_memory': ('board_resource_stats', 'free_memory', 'log_time'),
        'total_active': ('board_client_stats', 'total_active', 'log_time'),
    }
    if metric not in metric_map:
        raise ValueError("metric tidak dikenal. Gunakan: download_mbps, upload_mbps, cpu_load, free_memory")
    
    table, column, time_col = metric_map[metric]
    
    # Compose SQL dynamically (safe identifiers; values via params)
    # Aggregator SQL expression
    agg_sql = f"{agg}({column})" if agg != 'count' else "count(*)"
    
    query = text(f"""
        SELECT 
            date_trunc(:granularity, {time_col}) as period,
            {agg_sql} as value,
            count(*) as samples,
            avg(accuracy_pct) as accuracy_pct
        FROM {table}
        WHERE board_id = :board_id
          AND {time_col} >= :start_time
          AND {time_col} < :end_time
        GROUP BY period
        ORDER BY period ASC
    """)
    
    params = {
        "granularity": granularity,
        "board_id": str(board_id),
        "start_time": start_time,
        "end_time": end_time
    }
    
    res = await db.execute(query, params)
    rows = res.fetchall()
    
    # Serialize: ISO 8601 for period
    result = []
    for r in rows:
        period_val = r[0]
        try:
            period_str = period_val.isoformat()
        except Exception:
            period_str = str(period_val)
        result.append({
            "period": period_str,
            "value": float(r[1] or 0) if agg != 'count' else int(r[1] or 0),
            "count": int(r[2] or 0),
            "accuracy_pct": float(r[3] or 100.0),
            "granularity": granularity,
            "agg": agg,
            "metric": metric
        })
    return result

async def create_scoped_dataset(
    db: AsyncSession,
    board_id: UUID,
    start_time: datetime,
    end_time: datetime,
    granularity: str = "hour"
) -> str:
    """
    Stage 1: Scope & Filter (Context Lock)
    Membuat Temporary Table untuk mengunci dataset yang akan dianalisis.
    Mengembalikan nama tabel temporary yang dibuat.
    """
    temp_table_name = f"temp_scoped_{board_id.hex}_{int(start_time.timestamp())}"
    
    logger.info(f"[STAGE 1] Creating scoped dataset for board {board_id}, range: {start_time} - {end_time}")
    
    # Drop if exists (though it should be session-bound)
    await db.execute(text(f"DROP TABLE IF EXISTS {temp_table_name}"))
    
    # Create temp table combining traffic and resource
    # Using LEFT JOIN to ensure we have all timestamps from both
    query = text(f"""
        CREATE TEMPORARY TABLE {temp_table_name} AS
        WITH traffic AS (
            SELECT 
                date_trunc(:granularity, log_time) as period,
                avg(download_mbps) as rx,
                avg(upload_mbps) as tx,
                avg(accuracy_pct) as acc_traffic
            FROM board_speed_stats
            WHERE board_id = :board_id 
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
    
    await db.execute(query, {
        "board_id": str(board_id),
        "start_time": start_time,
        "end_time": end_time,
        "granularity": granularity
    })
    
    # P2: Performance Optimization - Create Index on Temp Table
    # Helps Stage 2 (Window Functions) and Stage 3 (Analytics)
    await db.execute(text(f"CREATE INDEX idx_{temp_table_name}_period ON {temp_table_name}(period)"))
    
    return temp_table_name

async def get_trend_analysis(
    db: AsyncSession,
    temp_table: str,
    window_size: int = 3
) -> Dict[str, Any]:
    """
    Stage 2: Trend & Aggregation.
    Menghitung Moving Average dan Summary dari Temporary Table (Scoped Dataset).
    """
    logger.info(f"[STAGE 2] Calculating trend analysis from {temp_table}")
    # 1. Calculate Moving Average using Window Function
    query_ma = text(f"""
        SELECT 
            period,
            rx,
            tx,
            AVG(rx) OVER (ORDER BY period ROWS BETWEEN :window_size PRECEDING AND CURRENT ROW) as rx_ma,
            AVG(tx) OVER (ORDER BY period ROWS BETWEEN :window_size PRECEDING AND CURRENT ROW) as tx_ma,
            cpu,
            mem
        FROM {temp_table}
        ORDER BY period ASC
    """)
    
    # 2. Calculate Overall Summary
    query_summary = text(f"""
        SELECT 
            AVG(rx) as avg_rx, MAX(rx) as max_rx,
            AVG(tx) as avg_tx, MAX(tx) as max_tx,
            AVG(cpu) as avg_cpu, MAX(cpu) as max_cpu,
            AVG(mem) as avg_mem, MIN(mem) as min_mem
        FROM {temp_table}
    """)
    
    res_ma = await db.execute(query_ma, {"window_size": window_size})
    rows_ma = res_ma.fetchall()
    
    res_sum = await db.execute(query_summary)
    summary = res_sum.fetchone()
    
    series = []
    for r in rows_ma:
        series.append({
            "period": r[0].isoformat() if r[0] else None,
            "rx": float(r[1] or 0),
            "tx": float(r[2] or 0),
            "rx_ma": float(r[3] or 0),
            "tx_ma": float(r[4] or 0),
            "cpu": float(r[5] or 0),
            "mem": float(r[6] or 0)
        })
        
    return {
        "summary": {
            "traffic": {
                "rx": {"avg": float(summary[0] or 0), "max": float(summary[1] or 0)},
                "tx": {"avg": float(summary[2] or 0), "max": float(summary[3] or 0)}
            },
            "resource": {
                "cpu": {"avg": float(summary[4] or 0), "max": float(summary[5] or 0)},
                "mem": {"avg": float(summary[6] or 0), "min": float(summary[7] or 0)}
            }
        },
        "series": series
    }

async def get_advanced_analytics(
    db: AsyncSession,
    temp_table: str
) -> Dict[str, Any]:
    """
    Stage 3-5: Analytics Engine.
    Menghitung Correlation, Habit, dan Anomaly dari Temporary Table.
    """
    logger.info(f"[STAGE 3-5] Running advanced analytics on {temp_table}")
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
    corr_val = res_corr.fetchone()[0]
    
    res_habit = await db.execute(query_habit)
    habits = [{"hour": int(r[0]), "avg_rx": float(r[1] or 0)} for r in res_habit.fetchall()]
    
    res_stats = await db.execute(query_stats)
    stats = res_stats.fetchone()
    mean_rx, std_rx = (stats[0] or 0), (stats[1] or 1)
    
    query_anomalies = text(f"""
        SELECT period, rx, (rx - :mean) / :std as z_score
        FROM {temp_table}
        WHERE abs((rx - :mean) / :std) > 2.0
        ORDER BY period ASC
    """)
    res_anomalies = await db.execute(query_anomalies, {"mean": mean_rx, "std": std_rx})
    anomalies = []
    for r in res_anomalies.fetchall():
        anomalies.append({
            "period": r[0].isoformat(),
            "rx": float(r[1] or 0),
            "z_score": float(r[2] or 0)
        })
        
    return {
        "correlation": {"rx_vs_cpu": float(corr_val or 0)},
        "habit": {"peak_hours": habits},
        "anomaly": {"detected_count": len(anomalies), "items": anomalies}
    }

async def calculate_health_score(
    trend_data: Dict[str, Any],
    analytics_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Stage 6: Health Score Engine.
    Menghitung skor kesehatan berdasarkan stabilitas, utilisasi, dan anomali.
    """
    logger.info("[STAGE 6] Calculating health score")
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
            std_rx = variance ** 0.5
            cv = std_rx / mean_rx
            stability_score = max(0, 100 - (cv * 100))
        else:
            stability_score = 100 # No traffic is stable
    else:
        stability_score = 100
        
    # 2. Utilization (30%) - 100 - avg_cpu
    avg_cpu = summary["resource"]["cpu"]["avg"]
    utilization_score = max(0, 100 - avg_cpu)
    
    # 3. Anomaly Penalty (40%) - Pengurangan per anomali
    anomaly_count = analytics_data["anomaly"]["detected_count"]
    # Penalty: 5 poin per anomali, max 40 poin.
    anomaly_penalty = min(40, anomaly_count * 5)
    anomaly_score = 40 - anomaly_penalty
    
    # Final Score
    total_score = (stability_score * 0.3) + (utilization_score * 0.3) + (anomaly_score)
    
    return {
        "total_score": round(total_score, 2),
        "components": {
            "stability": round(stability_score, 2),
            "utilization": round(utilization_score, 2),
            "anomaly_penalty": -anomaly_penalty
        }
    }

async def generate_insights(
    trend_data: Dict[str, Any],
    analytics_data: Dict[str, Any],
    health_score: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Stage 7: Insights Engine.
    Menghasilkan wawasan kualitatif dan rekomendasi berdasarkan data analisis.
    """
    logger.info("[STAGE 7] Generating qualitative insights")
    insights = []
    
    # 1. Health Insight
    score = health_score["total_score"]
    if score >= 85:
        insights.append({
            "type": "health",
            "level": "success",
            "title": "Kesehatan Sistem Sangat Baik",
            "message": f"Sistem beroperasi dengan optimal (Skor: {score}). Tidak diperlukan tindakan segera."
        })
    elif score >= 60:
        insights.append({
            "type": "health",
            "level": "warning",
            "title": "Kesehatan Sistem Menurun",
            "message": f"Sistem menunjukkan tanda-tanda degradasi (Skor: {score}). Perlu pemantauan lebih lanjut."
        })
    else:
        insights.append({
            "type": "health",
            "level": "danger",
            "title": "Kesehatan Sistem Kritis",
            "message": f"Ditemukan masalah serius pada sistem (Skor: {score}). Segera lakukan audit infrastruktur."
        })
        
    # 2. Traffic & Stability Insight
    stability = health_score["components"]["stability"]
    if stability < 40:
        insights.append({
            "type": "traffic",
            "level": "warning",
            "title": "Traffic Tidak Stabil",
            "message": "Fluktuasi traffic sangat tinggi. Pastikan tidak ada gangguan pada link provider atau hardware."
        })
        
    # 3. Resource Insight
    avg_cpu = trend_data["summary"]["resource"]["cpu"]["avg"]
    max_cpu = trend_data["summary"]["resource"]["cpu"]["max"]
    if max_cpu > 90:
        insights.append({
            "type": "resource",
            "level": "danger",
            "title": "CPU Overload",
            "message": f"CPU mencapai {max_cpu}%! Ini dapat menyebabkan packet loss atau disconnect."
        })
    elif avg_cpu > 70:
        insights.append({
            "type": "resource",
            "level": "warning",
            "title": "Beban CPU Tinggi",
            "message": f"Rata-rata penggunaan CPU ({avg_cpu}%) cukup tinggi untuk jangka panjang."
        })
        
    # 4. Anomaly Insight
    anomaly_count = analytics_data["anomaly"]["detected_count"]
    if anomaly_count > 0:
        insights.append({
            "type": "anomaly",
            "level": "danger",
            "title": f"Terdeteksi {anomaly_count} Anomali",
            "message": "Ditemukan lonjakan atau penurunan traffic yang tidak wajar. Periksa log keamanan."
        })
        
    # 5. Correlation Insight
    corr = analytics_data["correlation"]["rx_vs_cpu"]
    if corr > 0.8:
        insights.append({
            "type": "correlation",
            "level": "info",
            "title": "Korelasi Traffic-CPU Kuat",
            "message": "Peningkatan traffic berbanding lurus dengan beban CPU. Perilaku ini normal namun perlu diawasi saat peak."
        })
        
    # 6. Habit Insight
    peak_hours = analytics_data["habit"]["peak_hours"]
    if peak_hours:
        best_hour = peak_hours[0]["hour"]
        insights.append({
            "type": "habit",
            "level": "info",
            "title": "Waktu Penggunaan Puncak",
            "message": f"Traffic tertinggi biasanya terjadi pada pukul {best_hour:02d}:00. Hindari maintenance pada jam ini."
        })
    
    # 7. Forecasting Proxy (Based on Trends)
    # Simple logic: if last 3 periods are increasing, warn about growth.
    series = trend_data["series"]
    if len(series) >= 3:
        last_3 = [s["rx"] for s in series[-3:]]
        if last_3[0] < last_3[1] < last_3[2]:
            insights.append({
                "type": "forecast",
                "level": "info",
                "title": "Tren Traffic Meningkat",
                "message": "Terdeteksi kenaikan traffic dalam 3 periode terakhir. Siapkan kapasitas bandwidth tambahan jika tren berlanjut."
            })
        elif last_3[0] > last_3[1] > last_3[2]:
            insights.append({
                "type": "forecast",
                "level": "info",
                "title": "Tren Traffic Menurun",
                "message": "Terdeteksi penurunan traffic dalam 3 periode terakhir."
            })

    # 8. Memory Stability
    summary = trend_data["summary"]
    min_mem = summary["resource"]["mem"]["min"]
    if min_mem < 16: # Less than 16MB free is risky for many Mikrotik models
        insights.append({
            "type": "resource",
            "level": "danger",
            "title": "Sisa Memori Kritis",
            "message": f"Sisa memori terendah mencapai {min_mem} MB. Risiko reboot mendadak atau service crash tinggi."
        })

    return insights

async def get_heavy_analysis(
    db: AsyncSession, 
    board_id: UUID, 
    days: int = 30,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = 'day'
) -> Dict[str, Any]:
    """
    Melakukan agregasi berat di sisi database menggunakan SQL.
    Mencakup: P95/P99 Traffic, Forecasting, Anomaly Detection (Z-Score), dan Korelasi.
    """
    if not start_date:
        end_date_internal = date.today()
        start_date = end_date_internal - timedelta(days=days)
    else:
        # If start_date is provided, we use it. If end_date is not, we use today.
        if not end_date:
            end_date = date.today()
        # Update days for mid_date calculation if needed
        days = (end_date - start_date).days or 30

    # Determine final granularity
    granularity = _determine_granularity(start_date, end_date, granularity)

    # 0. Check if board exists
    board_check = await db.execute(text("SELECT board_id FROM mikrotik_boards WHERE board_id = :board_id"), {"board_id": board_id})
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
            (SELECT log_time FROM board_speed_stats WHERE board_id = :board_id AND download_mbps = (SELECT max(download_mbps) FROM board_speed_stats WHERE board_id = :board_id AND log_time >= :start_date AND (:end_date IS NULL OR log_time < :end_date + INTERVAL '1 day')) AND log_time >= :start_date AND (:end_date IS NULL OR log_time < :end_date + INTERVAL '1 day') LIMIT 1) as max_dl_date,
            (SELECT log_time FROM board_speed_stats WHERE board_id = :board_id AND upload_mbps = (SELECT max(upload_mbps) FROM board_speed_stats WHERE board_id = :board_id AND log_time >= :start_date AND (:end_date IS NULL OR log_time < :end_date + INTERVAL '1 day')) AND log_time >= :start_date AND (:end_date IS NULL OR log_time < :end_date + INTERVAL '1 day') LIMIT 1) as max_ul_date
        FROM board_speed_stats
        WHERE board_id = :board_id AND log_time >= :start_date AND (:end_date IS NULL OR log_time < :end_date + INTERVAL '1 day')
    """)
    
    # 2. Forecasting (Linear Regression Slope/Intercept)
    # Gunakan date_trunc untuk data mentah jika granularity < day
    # Jika granularity >= day, gunakan board_daily_summary untuk kecepatan
    if granularity in ['hour', 'minute']:
        forecast_query = text(f"""
            WITH raw_agg AS (
                SELECT 
                    date_trunc(:granularity, log_time) as period,
                    avg(download_mbps) as avg_dl
                FROM board_speed_stats
                WHERE board_id = :board_id AND log_time >= :start_date AND (:end_date IS NULL OR log_time < :end_date + INTERVAL '1 day')
                GROUP BY period
            )
            SELECT 
                regr_slope(avg_dl::float8, extract(epoch from period)::float8) as slope,
                regr_intercept(avg_dl::float8, extract(epoch from period)::float8) as intercept,
                0 as cpu_slope, 0 as cpu_intercept, 0 as mem_slope, 0 as mem_intercept
            FROM raw_agg
        """)
    elif granularity in ['week', 'month']:
        forecast_query = text(f"""
            WITH daily_agg AS (
                SELECT 
                    date_trunc(:granularity, log_date) as period,
                    avg(avg_download) as avg_dl,
                    avg(avg_cpu_load) as avg_cpu,
                    avg(min_free_memory) as avg_mem
                FROM board_daily_summary
                WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
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
            WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
        """)

    # 3. Anomaly Detection (Z-Score)
    if granularity in ['hour', 'minute']:
        anomaly_query = text(f"""
            WITH raw_data AS (
                SELECT 
                    date_trunc(:granularity, log_time) as period,
                    avg(download_mbps) as avg_dl
                FROM board_speed_stats
                WHERE board_id = :board_id AND log_time >= :start_date AND (:end_date IS NULL OR log_time < :end_date + INTERVAL '1 day')
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
    elif granularity in ['week', 'month']:
        anomaly_query = text(f"""
            WITH grouped_data AS (
                SELECT 
                    date_trunc(:granularity, log_date) as period,
                    avg(avg_download) as avg_dl,
                    avg(avg_cpu_load) as avg_cpu,
                    avg(min_free_memory) as avg_mem
                FROM board_daily_summary
                WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
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
                WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
            )
            SELECT 
                log_date, avg_download,
                (avg_download::float8 - stats.mean_dl) / NULLIF(stats.std_dl, 0) as z_score_dl,
                avg_cpu_load,
                (avg_cpu_load::float8 - stats.mean_cpu) / NULLIF(stats.std_cpu, 0) as z_score_cpu,
                min_free_memory,
                (min_free_memory::float8 - stats.mean_mem) / NULLIF(stats.std_mem, 0) as z_score_mem
            FROM board_daily_summary, stats
            WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
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
        WHERE cpu.board_id = :board_id AND cpu.log_time >= :start_date AND (:end_date IS NULL OR cpu.log_time < :end_date + INTERVAL '1 day')
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
        WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
    """)

    # 6. Top Growth Users
    growth_query = text("""
        WITH daily_usage AS (
            SELECT 
                COALESCE(pppoe_username, hotspot_username, interface_name) as username, 
                log_date, 
                sum(rx_bytes + tx_bytes) as total_bytes
            FROM (
                SELECT pppoe_username, NULL as hotspot_username, NULL as interface_name, log_date, download_bytes as rx_bytes, upload_bytes as tx_bytes 
                FROM board_pppoe_usage 
                WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
                
                UNION ALL
                
                SELECT NULL, username as hotspot_username, NULL, log_date, daily_download as rx_bytes, daily_upload as tx_bytes 
                FROM hotspot_usage_raw 
                WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
                
                UNION ALL
                
                SELECT NULL, NULL, interface_name, log_date, total_rx_bytes as rx_bytes, total_tx_bytes as tx_bytes 
                FROM board_interface_usage 
                WHERE board_id = :board_id AND log_date >= :start_date AND (:end_date IS NULL OR log_date <= :end_date)
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
        mid_date = start_date + timedelta(days=days//2)
        params = {"board_id": board_id, "start_date": start_date, "end_date": end_date, "granularity": granularity}
        
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
            "p95_dl": 0, "p99_dl": 0, "p95_ul": 0, "p99_ul": 0,
            "max_dl": 0, "max_ul": 0, "max_dl_date": None, "max_ul_date": None
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
                "max_ul_date": str(p_row[7]) if p_row[7] else None
            }

        res_forecast = {
            "traffic": {"slope": 0, "intercept": 0},
            "cpu": {"slope": 0, "intercept": 0},
            "memory": {"slope": 0, "intercept": 0},
            "target_date_epoch": (datetime.now() + timedelta(days=7)).timestamp()
        }
        if f_row:
            res_forecast["traffic"] = {"slope": float(f_row[0] or 0), "intercept": float(f_row[1] or 0)}
            res_forecast["cpu"] = {"slope": float(f_row[2] or 0), "intercept": float(f_row[3] or 0)}
            res_forecast["memory"] = {"slope": float(f_row[4] or 0), "intercept": float(f_row[5] or 0)}

        res_correlation = {"pearson_r": 0, "sample_size": 0}
        if c_row:
            res_correlation = {
                "pearson_r": float(c_row[0] or 0),
                "sample_size": int(c_row[1] or 0)
            }

        res_health = {
            "avg_cpu": 0, "peak_cpu": 0, "avg_mem": 0, "resource_alerts": 0,
            "cpu_std": 0, "mem_std": 0,
            "cpu_usage": 0, "mem_usage": 0, "cpu_p": 0
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
                "cpu_p": float(h_row[1] or 0)
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
                    "mem_z_score": float(row[6] or 0)
                }
                for row in a_rows
            ],
            "correlation": res_correlation,
            "health_stats": res_health,
            "top_growth_users": [
                {
                    "name": row[0],
                    "growth": float(row[3] or 0),
                    "current_usage": float(row[2] or 0)
                }
                for row in g_rows
            ]
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
        func.sum(BoardInterfaceUsage.total_rx_bytes).label('total_rx'),
        func.sum(BoardInterfaceUsage.total_tx_bytes).label('total_tx')
    ).where(
        and_(BoardInterfaceUsage.board_id == board_id, BoardInterfaceUsage.log_date == date.today())
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
    res_stmt = select(
        BoardResourceStat.cpu_load,
        BoardResourceStat.free_memory
    ).where(
        BoardResourceStat.board_id == board_id
    ).order_by(BoardResourceStat.log_time.desc()).limit(1)
    
    res_res = await db.execute(res_stmt)
    res_row = res_res.fetchone()
    
    cpu = 0
    mem = 0
    if res_row:
        cpu = int(res_row[0] or 0)
        mem = int(res_row[1] or 0)

    return {
        "today_traffic": {
            "rx": rx,
            "tx": tx
        },
        "today_resource": {
            "cpu": cpu,
            "cpu_usage": cpu,
            "cpu_p": cpu,
            "memory": mem,
            "mem_usage": mem
        }
    }

async def get_interface_pivot(
    db: AsyncSession, 
    board_id: UUID, 
    days: int = 30,
    pivot_agg: str = 'sum',
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = 'day'
) -> List[Dict[str, Any]]:
    """
    Mengambil data pivot per interface (Total Download/Upload per interface).
    Menggunakan BoardSpeedStat untuk fleksibilitas granularity jika diperlukan,
    tapi default tetap menggunakan Daily Summary untuk performa.
    """
    if not start_date:
        start_date = date.today() - timedelta(days=days)
    if not end_date:
        end_date = date.today()

    granularity = _determine_granularity(start_date, end_date, granularity)
    
    # Pilih model dan kolom berdasarkan granularity
    if granularity in ['hour', 'minute']:
        # Jika granularity halus, kita harus hitung dari data raw
        filters = [
            BoardSpeedStat.board_id == board_id,
            BoardSpeedStat.log_time >= start_date
        ]
        if end_date:
            filters.append(BoardSpeedStat.log_time < end_date + timedelta(days=1))
        
        agg_func = func.sum
        if pivot_agg == 'max':
            agg_func = func.max
        elif pivot_agg == 'avg':
            agg_func = func.avg

        # Note: BoardSpeedStat mungkin tidak punya interface_name di level raw 
        # jika itu speed test global. Namun model BoardInterfaceUsage punya data per interface.
        # Kita gunakan BoardInterfaceUsage (raw/hampir raw) untuk granularity halus.
        stmt = select(
            BoardInterfaceUsage.interface_name,
            agg_func(BoardInterfaceUsage.total_rx_bytes).label('dl_val'),
            agg_func(BoardInterfaceUsage.total_tx_bytes).label('ul_val')
        ).where(
            and_(
                BoardInterfaceUsage.board_id == board_id,
                BoardInterfaceUsage.log_date >= start_date,
                BoardInterfaceUsage.log_date <= (end_date or date.today())
            )
        ).group_by(BoardInterfaceUsage.interface_name).order_by(text("dl_val DESC"))
    else:
        # Default: gunakan Daily Summary (sangat cepat)
        filters = [
            BoardInterfaceDailySummary.board_id == board_id,
            BoardInterfaceDailySummary.log_date >= start_date
        ]
        if end_date:
            filters.append(BoardInterfaceDailySummary.log_date <= end_date)
        
        agg_func = func.sum
        if pivot_agg == 'max':
            agg_func = func.max
        elif pivot_agg == 'avg':
            agg_func = func.avg

        stmt = select(
            BoardInterfaceDailySummary.interface_name,
            agg_func(BoardInterfaceDailySummary.avg_download_mbps).label('dl_val'),
            agg_func(BoardInterfaceDailySummary.avg_upload_mbps).label('ul_val')
        ).where(
            and_(*filters)
        ).group_by(BoardInterfaceDailySummary.interface_name).order_by(text("dl_val DESC"))

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "name": row.interface_name,
            "dl": float(row.dl_val or 0),
            "ul": float(row.ul_val or 0),
            "tot": float((row.dl_val or 0) + (row.ul_val or 0))
        }
        for row in rows
    ]

async def get_interface_analysis(
    db: AsyncSession, 
    board_id: UUID, 
    days: int = 30,
    pivot_agg: str = 'sum',
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = 'day'
) -> List[Dict[str, Any]]:
    """
    Mengambil analisis per-interface dari data agregat.
    """
    if not start_date:
        start_date = date.today() - timedelta(days=days)
    
    # Untuk analisis detail, kita selalu gunakan Daily Summary jika granularity >= day
    # karena data p95/max sudah tersedia di sana.
    filters = [
        BoardInterfaceDailySummary.board_id == board_id,
        BoardInterfaceDailySummary.log_date >= start_date
    ]
    if end_date:
        filters.append(BoardInterfaceDailySummary.log_date <= end_date)
    
    # Pilih fungsi agregasi berdasarkan pivot_agg
    agg_func = func.sum
    if pivot_agg == 'max':
        agg_func = func.max
    elif pivot_agg == 'avg':
        agg_func = func.avg

    stmt = select(
        BoardInterfaceDailySummary.interface_name,
        agg_func(BoardInterfaceDailySummary.avg_download_mbps).label('dl_val'),
        agg_func(BoardInterfaceDailySummary.avg_upload_mbps).label('ul_val'),
        func.max(BoardInterfaceDailySummary.p95_download_mbps).label('p95_dl'),
        func.avg(BoardInterfaceDailySummary.avg_download_mbps).label('avg_dl'),
        func.max(BoardInterfaceDailySummary.max_download_mbps).label('max_dl')
    ).where(
        and_(*filters)
    ).group_by(BoardInterfaceDailySummary.interface_name).order_by(text("dl_val DESC"))

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
            "utilization_score": float((row.p95_dl or 0) / 100)
        }
        for row in rows
    ]

async def get_pppoe_pivot(
    db: AsyncSession, 
    board_id: UUID, 
    days: int = 30,
    pivot_agg: str = 'sum',
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = 'day'
) -> List[Dict[str, Any]]:
    """
    Mengambil data pivot per user PPPoE.
    """
    if not start_date:
        start_date = date.today() - timedelta(days=days)
    if not end_date:
        end_date = date.today()

    granularity = _determine_granularity(start_date, end_date, granularity)
    
    filters = [
        BoardPppoeUsage.board_id == board_id,
        BoardPppoeUsage.log_date >= start_date
    ]
    if end_date:
        filters.append(BoardPppoeUsage.log_date <= end_date)
    
    agg_func = func.sum
    if pivot_agg == 'max':
        agg_func = func.max
    elif pivot_agg == 'avg':
        agg_func = func.avg

    stmt = select(
        BoardPppoeUsage.pppoe_username,
        agg_func(BoardPppoeUsage.download_bytes).label('dl_bytes'),
        agg_func(BoardPppoeUsage.upload_bytes).label('ul_bytes')
    ).where(
        and_(*filters)
    ).group_by(BoardPppoeUsage.pppoe_username).order_by(text("dl_bytes DESC"))

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "name": row.pppoe_username,
            "dl": int(row.dl_bytes or 0),
            "ul": int(row.ul_bytes or 0),
            "tot": int((row.dl_bytes or 0) + (row.ul_bytes or 0))
        }
        for row in rows
    ]

async def get_hotspot_pivot(
    db: AsyncSession, 
    board_id: UUID, 
    days: int = 30,
    pivot_agg: str = 'sum',
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = 'day'
) -> List[Dict[str, Any]]:
    """
    Mengambil data pivot per user Hotspot.
    """
    if not start_date:
        start_date = date.today() - timedelta(days=days)
    if not end_date:
        end_date = date.today()

    granularity = _determine_granularity(start_date, end_date, granularity)
    
    filters = [
        HotspotUsageRaw.board_id == board_id,
        HotspotUsageRaw.log_date >= start_date
    ]
    if end_date:
        filters.append(HotspotUsageRaw.log_date <= end_date)
    
    agg_func = func.sum
    if pivot_agg == 'max':
        agg_func = func.max
    elif pivot_agg == 'avg':
        agg_func = func.avg

    stmt = select(
        HotspotUsageRaw.username,
        agg_func(HotspotUsageRaw.daily_download).label('dl_bytes'),
        agg_func(HotspotUsageRaw.daily_upload).label('ul_bytes')
    ).where(
        and_(*filters)
    ).group_by(HotspotUsageRaw.username).order_by(text("dl_bytes DESC"))

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "name": row.username,
            "dl": int(row.dl_bytes or 0),
            "ul": int(row.ul_bytes or 0),
            "tot": int((row.dl_bytes or 0) + (row.ul_bytes or 0))
        }
        for row in rows
    ]

async def get_pppoe_analysis(
    db: AsyncSession, 
    board_id: UUID, 
    days: int = 30,
    pivot_agg: str = 'sum',
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = 'day'
) -> List[Dict[str, Any]]:
    """
    Mengambil analisis per-user PPPoE dari data agregat.
    """
    if not start_date:
        start_date = date.today() - timedelta(days=days)
    if not end_date:
        end_date = date.today()

    granularity = _determine_granularity(start_date, end_date, granularity)
    
    filters = [
        BoardPppoeUsage.board_id == board_id,
        BoardPppoeUsage.log_date >= start_date
    ]
    if end_date:
        filters.append(BoardPppoeUsage.log_date <= end_date)
    
    agg_func = func.sum
    if pivot_agg == 'max':
        agg_func = func.max
    elif pivot_agg == 'avg':
        agg_func = func.avg

    stmt = select(
        BoardPppoeUsage.pppoe_username,
        agg_func(BoardPppoeUsage.download_bytes).label('dl_bytes'),
        agg_func(BoardPppoeUsage.upload_bytes).label('ul_bytes'),
        func.count(BoardPppoeUsage.log_date).label('active_days')
    ).where(
        and_(*filters)
    ).group_by(BoardPppoeUsage.pppoe_username).order_by(text("dl_bytes DESC"))

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "username": row.pppoe_username,
            "download_value": int(row.dl_bytes or 0),
            "upload_value": int(row.ul_bytes or 0),
            "active_days": int(row.active_days or 0),
            "avg_daily_usage": float((row.dl_bytes or 0) / (row.active_days or 1))
        }
        for row in rows
    ]

async def get_hotspot_analysis(
    db: AsyncSession, 
    board_id: UUID, 
    days: int = 30,
    pivot_agg: str = 'sum',
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = 'day'
) -> List[Dict[str, Any]]:
    """
    Mengambil analisis per-user Hotspot dari data agregat.
    """
    if not start_date:
        start_date = date.today() - timedelta(days=days)
    
    filters = [
        HotspotUsageRaw.board_id == board_id,
        HotspotUsageRaw.log_date >= start_date
    ]
    if end_date:
        filters.append(HotspotUsageRaw.log_date <= end_date)
    
    agg_func = func.sum
    if pivot_agg == 'max':
        agg_func = func.max
    elif pivot_agg == 'avg':
        agg_func = func.avg

    stmt = select(
        HotspotUsageRaw.username,
        agg_func(HotspotUsageRaw.daily_download).label('dl_bytes'),
        agg_func(HotspotUsageRaw.daily_upload).label('ul_bytes'),
        func.count(HotspotUsageRaw.log_date).label('active_days')
    ).where(
        and_(*filters)
    ).group_by(HotspotUsageRaw.username).order_by(text("dl_bytes DESC"))

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "username": row.username,
            "download_value": int(row.dl_bytes or 0),
            "upload_value": int(row.ul_bytes or 0),
            "active_days": int(row.active_days or 0),
            "avg_daily_usage": float((row.dl_bytes or 0) / (row.active_days or 1))
        }
        for row in rows
    ]

async def get_clients_analysis(
    db: AsyncSession, 
    board_id: UUID, 
    days: int = 30,
    pivot_agg: str = 'max',
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = 'day'
) -> List[Dict[str, Any]]:
    """
    Mengambil data jumlah client (PPPoE & Hotspot) dengan granularity.
    """
    if not start_date:
        start_date = date.today() - timedelta(days=days)
    if not end_date:
        end_date = date.today()

    granularity = _determine_granularity(start_date, end_date, granularity)

    # Mapping aggregation function
    agg_func = func.max
    if pivot_agg == 'avg':
        agg_func = func.avg

    # Jika granularity halus, ambil dari BoardClientStat (raw per log_time)
    if granularity in ['hour', 'minute']:
        stmt = select(
            func.date_trunc(granularity, BoardClientStat.log_time).label('period'),
            agg_func(BoardClientStat.total_pppoe).label('pppoe'),
            agg_func(BoardClientStat.total_hotspot).label('hotspot')
        ).where(
            and_(
                BoardClientStat.board_id == board_id,
                BoardClientStat.log_time >= start_date,
                BoardClientStat.log_time < (end_date or date.today()) + timedelta(days=1)
            )
        ).group_by(text('period')).order_by(text('period ASC'))
    else:
        # Default: gunakan Daily Summary (BoardDailySummary)
        stmt = select(
            BoardDailySummary.log_date.label('period'),
            BoardDailySummary.max_pppoe_users.label('pppoe'),
            BoardDailySummary.max_hotspot_users.label('hotspot')
        ).where(
            and_(
                BoardDailySummary.board_id == board_id,
                BoardDailySummary.log_date >= start_date,
                BoardDailySummary.log_date <= (end_date or date.today())
            )
        ).order_by(BoardDailySummary.log_date.asc())

    res = await db.execute(stmt)
    rows = res.fetchall()

    return [
        {
            "date": str(row.period),
            "pppoe_active": int(row.pppoe or 0),
            "hotspot_active": int(row.hotspot or 0),
            "total_active": int((row.pppoe or 0) + (row.hotspot or 0))
        }
        for row in rows
    ]

async def get_interface_forecast(db: AsyncSession, board_id: UUID, interface_name: str, days: int = 30) -> Dict[str, Any]:
    """
    Melakukan forecasting khusus untuk satu interface.
    """
    start_date = date.today() - timedelta(days=days)
    
    forecast_query = text("""
        SELECT 
            regr_slope(avg_download_mbps, extract(epoch from log_date)) as slope,
            regr_intercept(avg_download_mbps, extract(epoch from log_date)) as intercept,
            regr_slope(p95_download_mbps, extract(epoch from log_date)) as p95_slope,
            regr_intercept(p95_download_mbps, extract(epoch from log_date)) as p95_intercept
        FROM board_interface_daily_summary
        WHERE board_id = :board_id 
        AND interface_name = :interface_name 
        AND log_date >= :start_date
    """)

    res = await db.execute(forecast_query, {
        "board_id": board_id,
        "interface_name": interface_name,
        "start_date": start_date
    })
    row = res.fetchone()

    if not row or row[0] is None:
        return {"slope": 0, "intercept": 0, "p95_slope": 0, "p95_intercept": 0}

    return {
        "slope": float(row[0] or 0),
        "intercept": float(row[1] or 0),
        "p95_slope": float(row[2] or 0),
        "p95_intercept": float(row[3] or 0),
        "target_date_epoch": (datetime.now() + timedelta(days=7)).timestamp()
    }
