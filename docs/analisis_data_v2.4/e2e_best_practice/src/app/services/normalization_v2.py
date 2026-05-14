# UPDATED 2.4.1 Dengan Perbaikan Mapping Unit Mbps dan Granularitas Auto
from __future__ import annotations

import logging
import math
import time
import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from prometheus_client import Histogram
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.missing_data_handler import MissingDataHandler
from app.models.mikrotik import (
    BoardSpeedStat,
    BoardResourceStat,
    BoardClientStat,
    BoardInterfaceUsage,
    BoardPppoeUsage,
    HotspotUsageRaw,
    MikrotikBoard,
    MasterBoardModel,
)
from app.services.analysis_service import _determine_time_granularity, time_aggregate

# Prometheus Metrics for Normalization Performance
NORMALIZATION_LATENCY = Histogram(
    "normalization_latency_seconds",
    "Latency of normalization process in seconds",
    ["stage"],
)

# V2.4.2: Global safety guard for timeline generation
MAX_TIMELINE_POINTS = 100_000
logger = logging.getLogger(__name__)
handler = MissingDataHandler()


def _parse_iso_date(s: str) -> date:
    return date.fromisoformat(s)


def _parse_iso_datetime(s: str) -> datetime:
    """
    Parse ISO datetime string ke naive datetime (convert ke UTC baru strip TZ info).
    V2.4.2: Pastikan konversi ke UTC sebelum menghapus tzinfo.
    """
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt.replace(tzinfo=None)


def _truncate(dt: datetime, granularity: str) -> datetime:
    if granularity == "year":
        return dt.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    if granularity == "month":
        return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if granularity == "day":
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    if granularity == "hour":
        return dt.replace(minute=0, second=0, microsecond=0)
    return dt


def _step_for(granularity: str) -> timedelta:
    if granularity == "year":
        return timedelta(days=365)  # Fallback only, logic handled in _build_timeline
    if granularity == "day":
        return timedelta(days=1)
    if granularity == "hour":
        return timedelta(hours=1)
    return timedelta(days=1)


def _build_timeline(start: datetime, end: datetime, granularity: str) -> List[datetime]:
    pts: List[datetime] = []
    cur = _truncate(start, granularity)
    step = _step_for(granularity)
    guard = 0
    while cur < end and guard < MAX_TIMELINE_POINTS:
        pts.append(cur)
        if granularity == "month":
            y = cur.year + (cur.month // 12)
            m = (cur.month % 12) + 1
            cur = cur.replace(year=y, month=m, day=1)
        elif granularity == "year":
            cur = cur.replace(year=cur.year + 1, month=1, day=1)
        else:
            cur = cur + step
        guard += 1
    
    if guard >= MAX_TIMELINE_POINTS:
        logger.warning(
            f"Timeline truncated at {MAX_TIMELINE_POINTS} points for {granularity} granularity "
            f"between {start} and {end}"
        )
    
    # V2.4.2 Fix: Fallback for empty timeline if start/end are in the same bucket
    if not pts:
        pts.append(_truncate(start, granularity))
        
    return pts


def _safe_float(x: Any) -> float:
    """
    V2.4.2 Fix: Safely convert to float, handling None, NaN, Infinity, and extreme values.
    """
    try:
        v = float(x)
        if math.isfinite(v):
            # Clamp to prevent float overflow in JSON serialization or downstream DB
            # 1e15 is a safe threshold for most analytics without losing significant precision
            return max(-1e15, min(v, 1e15))
    except (ValueError, TypeError):
        pass
    return 0.0


# V2.4.2 Fix: Deleted unused _is_finite_number
def _to_iso_key(dt: datetime) -> str:
    """
    V2.4.2: Consistent ISO key with Z (UTC) suffix for frontend parsing.
    """
    return dt.replace(tzinfo=None, microsecond=0).isoformat() + "Z"


def _map_rows_by_period(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    V2.4.2: Utility to map raw rows by their period ISO key.
    """
    res_map = {}
    for r in rows or []:
        p = r.get("period")
        if isinstance(p, datetime):
            res_map[_to_iso_key(p)] = r
        elif isinstance(p, str):
            res_map[_to_iso_key(_parse_iso_datetime(p))] = r
    return res_map


def _collect_dual_metrics(
    timeline: List[datetime],
    map1: Dict[str, Dict[str, Any]],
    map2: Dict[str, Dict[str, Any]],
) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[str]]]:
    """
    V2.4.2: Utility to collect values and raw timestamps from two maps across a timeline.
    """
    raw_v1: List[Optional[float]] = []
    raw_v2: List[Optional[float]] = []
    raw_ts: List[Optional[str]] = []

    for t in timeline:
        key = _to_iso_key(t)
        d1 = map1.get(key, {})
        d2 = map2.get(key, {})

        v1_val = d1.get("value")
        v2_val = d2.get("value")

        ts_val = d1.get("period") or d2.get("period")
        if isinstance(ts_val, datetime):
            ts_val = ts_val.isoformat()
        raw_ts.append(ts_val)

        raw_v1.append(_safe_float(v1_val) if v1_val is not None else None)
        raw_v2.append(_safe_float(v2_val) if v2_val is not None else None)

    return raw_v1, raw_v2, raw_ts


def _normalize_traffic(
    dl_rows: List[Dict[str, Any]],
    ul_rows: List[Dict[str, Any]],
    start: datetime,
    end: datetime,
    granularity: str,
    board_id: UUID,
    usage_unit: str = "Mbps",
    fill_gaps: bool = True,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    dl_map = _map_rows_by_period(dl_rows)
    ul_map = _map_rows_by_period(ul_rows)

    keys = set(dl_map.keys()) | set(ul_map.keys())
    dropped = 0
    res: List[Dict[str, Any]] = []

    if fill_gaps:
        timeline = _build_timeline(start, end, granularity)

        # Phase 1: Collect original values and identify gaps
        raw_rx, raw_tx, raw_ts = _collect_dual_metrics(timeline, dl_map, ul_map)

        # Phase 2: Missing Data Analysis & Imputation Strategy
        rx_stats = handler.detect_missing_data(raw_rx)
        tx_stats = handler.detect_missing_data(raw_tx)

        # V2.1 Compliance: Audit Critical Zone (>30% missing)
        is_critical = (
            rx_stats["status"] == "CRITICAL" or tx_stats["status"] == "CRITICAL"
        )

        rx_strategy = handler.select_strategy(
            "traffic_rx", rx_stats["missing_percentage"]
        )
        tx_strategy = handler.select_strategy(
            "traffic_tx", tx_stats["missing_percentage"]
        )

        # Phase 3: Apply Imputation
        imputed_rx = handler.handle_missing_data(raw_rx, rx_strategy)
        imputed_tx = handler.handle_missing_data(raw_tx, tx_strategy)

        # Phase 4: Final Mapping with Metadata V2.1
        for i, t in enumerate(timeline):
            # V2.4.1 Fix: Use ISO format to ensure consistent key matching
            key = _to_iso_key(t) # V2.4.2 Optimization: timeline is already truncated
            is_gap = key not in keys

            rx = imputed_rx[i]
            tx = imputed_tx[i]
            
            # V2.4.1 Fix Zero/Invalid: Ensure float
            rx = _safe_float(rx)
            tx = _safe_float(tx)

            dl_data = dl_map.get(key, {})
            ul_data = ul_map.get(key, {})

            acc_dl = dl_data.get("accuracy_pct", 100.0)
            acc_ul = ul_data.get("accuracy_pct", 100.0)

            # UPDATE 2.4.1 Fix accuracy 0% logic: If it's a gap, accuracy should reflect the quality
            # of the imputation (e.g. 50% for standard imputation) instead of a hard 0%
            # which is misleading for users. If data exists, use the real accuracy.
            # V2.4.1 Fix Zero Logic: 0 is a valid value and should have its accuracy preserved.
            # is_gap only true if key not in keys (no raw data in that bucket).
            if not is_gap:
                avg_acc = max(0.0, min((acc_dl + acc_ul) / 2.0, 100.0))
            else:
                # Gaps filled by imputation are not 100% accurate, but not 0% either.
                # 50% is a fair representation of "estimated" data quality.
                avg_acc = 50.0

            res.append(
                {
                    "timestamp": key,  # Ensure this is ISO string
                    "display_date": key,
                    "rx": rx,
                    "tx": tx,
                    "total": rx + tx,
                    "unit": usage_unit,
                    "is_gap": is_gap,
                    "is_critical": is_critical,
                    "raw_timestamp": raw_ts[i], # Audit V2.4.2: Link back to original source timestamp
                    "source_id": str(board_id),
                    "source_table": "board_speed_stats", # Rule V2.4.2
                    "accuracy_pct": avg_acc,
                    "imputation_strategy": (
                        "mixed" if is_gap and rx_strategy != tx_strategy else (rx_strategy.value if is_gap else None)
                    ),
                    "imputation_strategy_rx": (
                        rx_strategy.value if is_gap else None
                    ),
                    "imputation_strategy_tx": (
                        tx_strategy.value if is_gap else None
                    ),
                }
            )
    else:
        for k in sorted(keys):
            dl_data = dl_map.get(k, {})
            ul_data = ul_map.get(k, {})

            rx = _safe_float(dl_data.get("value"))
            tx = _safe_float(ul_data.get("value"))

            acc_dl = dl_data.get("accuracy_pct", 100.0)
            acc_ul = ul_data.get("accuracy_pct", 100.0)
            avg_acc = (acc_dl + acc_ul) / 2.0

            # V2.4.2 Fix: Capture raw timestamp even in non-gap mode
            raw_ts_val = dl_data.get("period") or ul_data.get("period")
            if isinstance(raw_ts_val, datetime):
                raw_ts_val = raw_ts_val.isoformat()

            res.append(
                {
                    "timestamp": k,
                    "display_date": k,
                    "rx": rx,
                    "tx": tx,
                    "total": rx + tx,
                    "unit": usage_unit,
                    "is_gap": False,
                    "raw_timestamp": raw_ts_val, # V2.4.2 Fix: Use source timestamp
                    # Mandatory Metadata V2.1
                    "source_id": str(board_id),
                    "source_table": "board_speed_stats", # Rule V2.4.2
                    "accuracy_pct": avg_acc,
                }
            )
    valid = len(res)
    return res, {
        "valid_count": valid,
        "dropped_count": dropped,
        "gap_count": sum(1 for r in res if r.get("is_gap")),
        "sample_size": len(dl_rows) + len(ul_rows), # V2.4.2: Total raw records before aggregation
        "gap_analysis": {
            "rx": rx_stats.get("gap_analysis"),
            "tx": tx_stats.get("gap_analysis")
        }
    }


def _normalize_resource(
    cpu_rows: List[Dict[str, Any]],
    mem_rows: List[Dict[str, Any]],
    start: datetime,
    end: datetime,
    granularity: str,
    board_id: UUID,
    fill_gaps: bool = True,
    total_memory: int = 0, # Audit V2.4.2: Pass total_memory for usage calculation
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    cpu_map = _map_rows_by_period(cpu_rows)
    mem_map = _map_rows_by_period(mem_rows)

    keys = set(cpu_map.keys()) | set(mem_map.keys())
    dropped = 0
    res: List[Dict[str, Any]] = []

    if fill_gaps:
        timeline = _build_timeline(start, end, granularity)

        # Phase 1: Collect original values
        raw_cpu, raw_mem, raw_ts = _collect_dual_metrics(timeline, cpu_map, mem_map)

        # Phase 2: Missing Data Analysis
        cpu_stats = handler.detect_missing_data(raw_cpu)
        mem_stats = handler.detect_missing_data(raw_mem)

        # V2.1 Compliance: Audit Critical Zone (>30% missing)
        is_critical = (
            cpu_stats["status"] == "CRITICAL" or mem_stats["status"] == "CRITICAL"
        )

        cpu_strategy = handler.select_strategy("cpu", cpu_stats["missing_percentage"])
        mem_strategy = handler.select_strategy(
            "memory", mem_stats["missing_percentage"]
        )

        # Phase 3: Apply Imputation
        imputed_cpu = handler.handle_missing_data(raw_cpu, cpu_strategy)
        imputed_mem = handler.handle_missing_data(raw_mem, mem_strategy)

        # Phase 4: Final Mapping
        for i, t in enumerate(timeline):
            # V2.4.1 Fix: Use ISO format for consistent key matching
            key = _to_iso_key(t) # V2.4.2 Optimization: timeline is already truncated
            is_gap = key not in keys

            cpu_val = imputed_cpu[i]
            mem_val = imputed_mem[i]
            
            # V2.4.1 Fix Zero/Invalid: Ensure float
            cpu_val = _safe_float(cpu_val)
            mem_val = _safe_float(mem_val)

            cpu_data = cpu_map.get(key, {})
            mem_data = mem_map.get(key, {})

            acc_cpu = cpu_data.get("accuracy_pct", 100.0)
            acc_mem = mem_data.get("accuracy_pct", 100.0)

            # UPDATE 2.4.1 Fix accuracy 0% logic: Same as traffic, use 50% for imputed gaps
            if not is_gap:
                avg_acc = max(0.0, min((acc_cpu + acc_mem) / 2.0, 100.0))
            else:
                avg_acc = 50.0

            # Audit V2.4.2: Calculate memory usage percentage
            mem_usage_pct = None
            if total_memory > 0 and mem_val is not None:
                mem_usage_pct = max(0.0, min(((total_memory - mem_val) / total_memory) * 100.0, 100.0))

            res.append(
                {
                    "timestamp": key,  # Ensure this is ISO string
                    "display_date": key,
                    "cpu_usage_pct": max(0.0, min(_safe_float(cpu_val), 100.0)),
                    "free_memory": mem_val,
                    "free_memory_mb": round(mem_val / (1024 * 1024), 1) if mem_val is not None else 0.0,
                    "memory_usage_pct": mem_usage_pct,
                    "is_gap": is_gap,
                    "is_critical": is_critical,
                    "raw_timestamp": raw_ts[i], # Audit V2.4.2: Link back to original source timestamp
                    "source_id": str(board_id),
                    "source_table": "board_resource_stats", # Rule V2.4.2
                    "accuracy_pct": avg_acc,
                    "imputation_strategy": (
                        "mixed" if is_gap and cpu_strategy != mem_strategy else (cpu_strategy.value if is_gap else None)
                    ),
                    "imputation_strategy_cpu": (
                        cpu_strategy.value if is_gap else None
                    ),
                    "imputation_strategy_mem": (
                        mem_strategy.value if is_gap else None
                    ),
                }
            )
    else:
        for k in sorted(keys):
            cpu_data = cpu_map.get(k, {})
            mem_data = mem_map.get(k, {})

            cpu_val = _safe_float(cpu_data.get("value"))
            mem_val = _safe_float(mem_data.get("value"))

            acc_cpu = cpu_data.get("accuracy_pct", 100.0)
            acc_mem = mem_data.get("accuracy_pct", 100.0)
            avg_acc = (acc_cpu + acc_mem) / 2.0

            # Audit V2.4.2: Calculate memory usage percentage
            mem_usage_pct = None
            if total_memory > 0 and mem_val is not None:
                mem_usage_pct = max(0.0, min(((total_memory - mem_val) / total_memory) * 100.0, 100.0))

            # V2.4.2 Fix: Capture raw timestamp even in non-gap mode
            raw_ts_val = cpu_data.get("period") or mem_data.get("period")
            if isinstance(raw_ts_val, datetime):
                raw_ts_val = raw_ts_val.isoformat()

            res.append(
                {
                    "timestamp": k,
                    "display_date": k,
                    "cpu_usage_pct": max(0.0, min(_safe_float(cpu_val), 100.0)),
                    "free_memory": mem_val,
                    "memory_usage_pct": mem_usage_pct,
                    "is_gap": False,
                    "raw_timestamp": raw_ts_val, # V2.4.2 Fix: Use source timestamp
                    # Mandatory Metadata V2.1
                    "source_id": str(board_id),
                    "source_table": "board_resource_stats", # Rule V2.4.2
                    "accuracy_pct": avg_acc,
                }
            )
    valid = len(res)
    return res, {
        "valid_count": valid,
        "dropped_count": dropped,
        "gap_count": sum(1 for r in res if r.get("is_gap")),
        "sample_size": len(cpu_rows) + len(mem_rows), # V2.4.2: Total raw records before aggregation
        "gap_analysis": {
            "cpu": cpu_stats.get("gap_analysis"),
            "mem": mem_stats.get("gap_analysis")
        }
    }


def _normalize_users(
    hotspot_rows: List[Dict[str, Any]],
    pppoe_rows: List[Dict[str, Any]],
    start: datetime,
    end: datetime,
    granularity: str,
    board_id: UUID,
    fill_gaps: bool = True,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    V2.4.1 Added: Normalisasi data user (Hotspot & PPPoE) untuk Full Network Analytics.
    """
    hs_map = _map_rows_by_period(hotspot_rows)
    pp_map = _map_rows_by_period(pppoe_rows)

    keys = set(hs_map.keys()) | set(pp_map.keys())
    dropped = 0
    res: List[Dict[str, Any]] = []

    if fill_gaps:
        timeline = _build_timeline(start, end, granularity)
        raw_hs, raw_pp, raw_ts = _collect_dual_metrics(timeline, hs_map, pp_map)

        # V2.4.2 Fix: Use detect_missing_data and select_strategy for users
        hs_stats = handler.detect_missing_data(raw_hs)
        pp_stats = handler.detect_missing_data(raw_pp)
        
        hs_strategy = handler.select_strategy("users_hs", hs_stats["missing_percentage"])
        pp_strategy = handler.select_strategy("users_pp", pp_stats["missing_percentage"])

        # Imputation (Linear/Forward fill as fallback)
        imp_hs = handler.handle_missing_data(raw_hs, hs_strategy)
        imp_pp = handler.handle_missing_data(raw_pp, pp_strategy)

        for i, t in enumerate(timeline):
            key = _to_iso_key(t)
            is_gap = key not in keys
            hs_val = imp_hs[i]
            pp_val = imp_pp[i]
            
            # V2.4.2 Accuracy Logic
            if not is_gap:
                acc_val = 100.0
            else:
                acc_val = 50.0

            res.append({
                "timestamp": key,
                "display_date": key,
                "hotspot_users": hs_val,
                "pppoe_users": pp_val,
                "active_users": hs_val + pp_val,
                "is_gap": is_gap,
                "accuracy_pct": acc_val,
                "imputation_strategy": (
                    "mixed" if is_gap and hs_strategy != pp_strategy else (hs_strategy.value if is_gap else None)
                ),
                "imputation_strategy_hs": (
                    hs_strategy.value if is_gap else None
                ),
                "imputation_strategy_pp": (
                    pp_strategy.value if is_gap else None
                ),
                "raw_timestamp": raw_ts[i], # Audit V2.4.2: Link back to original source timestamp
                "source_id": str(board_id),
                "source_table": "hotspot_usage_raw", # Rule V2.4.2 (Using HS as primary user source)
            })
    else:
        for k in sorted(keys):
            hs_data = hs_map.get(k, {})
            pp_data = pp_map.get(k, {})
            
            hs_val = _safe_float(hs_data.get("value"))
            pp_val = _safe_float(pp_data.get("value"))

            # V2.4.2 Fix: Capture raw timestamp even in non-gap mode
            raw_ts_val = hs_data.get("period") or pp_data.get("period")
            if isinstance(raw_ts_val, datetime):
                raw_ts_val = raw_ts_val.isoformat()

            res.append({
                "timestamp": k,
                "display_date": k,
                "hotspot_users": hs_val,
                "pppoe_users": pp_val,
                "active_users": hs_val + pp_val,
                "is_gap": False,
                "raw_timestamp": raw_ts_val, # V2.4.2 Fix: Use source timestamp
                # Mandatory Metadata V2.1
                "source_id": str(board_id),
                "source_table": "hotspot_usage_raw", # Rule V2.4.2
            })
    valid = len(res)
    return res, {
        "valid_count": valid,
        "dropped_count": dropped,
        "gap_count": sum(1 for r in res if r.get("is_gap")),
        "sample_size": len(hotspot_rows) + len(pppoe_rows), # V2.4.2: Total raw records before aggregation
        "gap_analysis": {
            "hs": hs_stats.get("gap_analysis") if fill_gaps else None,
            "pp": pp_stats.get("gap_analysis") if fill_gaps else None
        }
    }


async def run_normalization_preview(
    db: AsyncSession,
    board_id: UUID,
    start_time: datetime,
    end_time: datetime,
    granularity: str = "auto",
    agg: str = "avg",
    bucket_source: str = "server",
    usage_unit: str = "Mbps",
    fill_gaps: bool = True,
    interface_name: Optional[str] = None,
) -> Dict[str, Any]:
    if end_time <= start_time:
        raise ValueError("end_time must be greater than start_time")
    if granularity not in ["auto", "year", "month", "day", "hour"]:
        raise ValueError("granularity invalid")

    start_ts = time.time()
    try:
        # Resolve granularity if "auto" before normalization
        # This ensures _truncate and _build_timeline use the same granularity as time_aggregate
        resolved_granularity = _determine_time_granularity(
            start_time, end_time, granularity
        )

        # UPDATE 2.4.1: Row Count for Normalization Preview (Stage 0)
        # Fetch row counts for the specific board across relevant tables
        row_counts = []
        tables_to_check = [
            ("board_speed_stats", BoardSpeedStat),
            ("board_resource_stats", BoardResourceStat),
            ("board_client_stats", BoardClientStat),
            ("board_interface_usage", BoardInterfaceUsage),
            ("board_pppoe_usage", BoardPppoeUsage),
            ("hotspot_usage_raw", HotspotUsageRaw),
        ]
        
        for table_name, model in tables_to_check:
            # V2.4.2 Production Performance Optimization:
            # 1. Total table estimate (instant) using pg_class.reltuples as suggested
            # This avoids expensive COUNT(*) on tables with 50M+ rows in production.
            total_est = 0
            try:
                # Note: For partitioned tables, this returns the parent estimate if analyzed
                est_stmt = text(f"SELECT reltuples::bigint FROM pg_class WHERE relname = :t")
                est_res = await db.execute(est_stmt, {"t": table_name})
                total_est = est_res.scalar() or 0
            except Exception as e:
                logger.warning(f"Failed to get estimate for {table_name}: {e}")

            # 2. Filtered count (board_id + time range)
            # This is still required for Stage 0 context but can be slow.
            # We keep it for now but the total_est gives scale context.
            stmt = select(func.count()).select_from(model).where(model.board_id == board_id)
            # Apply time filter if applicable to provide relevant Stage 0 context
            if hasattr(model, "log_time"):
                stmt = stmt.where(model.log_time.between(start_time, end_time))
            elif hasattr(model, "log_date"):
                stmt = stmt.where(model.log_date.between(start_time.date(), end_time.date()))
                
            count_result = await db.execute(stmt)
            row_counts.append({
                "table_name": table_name,
                "row_count": count_result.scalar() or 0,
                "table_total_estimate": total_est
            })

        # V2.4.2: Fetch board model info to get total_memory for analytics
        total_memory = 0
        try:
            board_info_stmt = (
                select(MasterBoardModel.total_memory)
                .join(MikrotikBoard, MikrotikBoard.model_id == MasterBoardModel.model_id)
                .where(MikrotikBoard.board_id == board_id)
            )
            board_info_res = await db.execute(board_info_stmt)
            total_memory = board_info_res.scalar() or 0
        except Exception as e:
            logger.warning(f"Failed to fetch total_memory for board {board_id}: {e}")

        dl_task = time_aggregate(
            db,
            board_id,
            metric="download_mbps",
            agg=agg,
            start_time=start_time,
            end_time=end_time,
            granularity=resolved_granularity,
            interface_name=interface_name,
        )
        ul_task = time_aggregate(
            db,
            board_id,
            metric="upload_mbps",
            agg=agg,
            start_time=start_time,
            end_time=end_time,
            granularity=resolved_granularity,
            interface_name=interface_name,
        )
        cpu_task = time_aggregate(
            db,
            board_id,
            metric="cpu_load",
            agg=agg,
            start_time=start_time,
            end_time=end_time,
            granularity=resolved_granularity,
        )
        mem_task = time_aggregate(
            db,
            board_id,
            metric="free_memory",
            agg=agg,
            start_time=start_time,
            end_time=end_time,
            granularity=resolved_granularity,
        )
        hs_task = time_aggregate(
            db,
            board_id,
            metric="total_hotspot",
            agg=agg,
            start_time=start_time,
            end_time=end_time,
            granularity=resolved_granularity,
        )
        pp_task = time_aggregate(
            db,
            board_id,
            metric="total_pppoe",
            agg=agg,
            start_time=start_time,
            end_time=end_time,
            granularity=resolved_granularity,
        )

        dl, ul, cpu, mem, hs, pp = await asyncio.gather(
            dl_task, ul_task, cpu_task, mem_task, hs_task, pp_task
        )

        NORMALIZATION_LATENCY.labels(stage="fetch").observe(time.time() - start_ts)

        process_ts = time.time()
        # Use resolved_granularity for normalization mapping
        traffic, traffic_meta = _normalize_traffic(
            dl,
            ul,
            start_time,
            end_time,
            resolved_granularity,
            board_id,
            usage_unit,
            fill_gaps,
        )
        resource, resource_meta = _normalize_resource(
            cpu, mem, start_time, end_time, resolved_granularity, board_id, fill_gaps, total_memory
        )
        users, users_meta = _normalize_users(
            hs, pp, start_time, end_time, resolved_granularity, board_id, fill_gaps
        )
        NORMALIZATION_LATENCY.labels(stage="process").observe(time.time() - process_ts)

    except Exception as e:
        logger.error(f"normalize fetch failed: {e}")
        raise

    meta = {"traffic": traffic_meta, "resource": resource_meta, "users": users_meta}

    total_latency = time.time() - start_ts
    NORMALIZATION_LATENCY.labels(stage="total").observe(total_latency)

    # Use 'meta' for logging or other purposes if needed, but the return uses individual meta components
    _ = meta  # noqa: F841

    # Aggregate metadata for frontend compliance V2.3
    combined_valid = (
        traffic_meta.get("valid_count", 0) + 
        resource_meta.get("valid_count", 0) + 
        users_meta.get("valid_count", 0)
    )
    combined_dropped = (
        traffic_meta.get("dropped_count", 0) + 
        resource_meta.get("dropped_count", 0) +
        users_meta.get("dropped_count", 0)
    )
    combined_gaps = (
        traffic_meta.get("gap_count", 0) + 
        resource_meta.get("gap_count", 0) + 
        users_meta.get("gap_count", 0)
    )

    # Calculate tab-specific accuracy
    for m in [traffic_meta, resource_meta, users_meta]:
        m["accuracy_pct"] = 100.0
        
    if len(traffic) > 0:
        traffic_meta["accuracy_pct"] = round(sum(t.get("accuracy_pct", 0.0) for t in traffic) / len(traffic), 2)
    if len(resource) > 0:
        resource_meta["accuracy_pct"] = round(sum(r.get("accuracy_pct", 0.0) for r in resource) / len(resource), 2)
    if len(users) > 0:
        users_meta["accuracy_pct"] = round(sum(u.get("accuracy_pct", 0.0) for u in users) / len(users), 2)

    # V2.4.2 Fix: Calculate global accuracy percentage (Macro-average of categories to avoid bias)
    category_accs = []
    if len(traffic) > 0:
        category_accs.append(traffic_meta["accuracy_pct"])
    if len(resource) > 0:
        category_accs.append(resource_meta["accuracy_pct"])
    if len(users) > 0:
        category_accs.append(users_meta["accuracy_pct"])

    if category_accs:
        accuracy_pct = round(sum(category_accs) / len(category_accs), 2)
    else:
        accuracy_pct = 0.0

    return {
        "granularity": resolved_granularity,
        "bucket_source": bucket_source,
        "usage_unit": usage_unit,
        "traffic": traffic,
        "resource": resource,
        "users": users,  # V2.4.1 Added users data
        "accuracy_pct": accuracy_pct,
        "row_counts": row_counts,  # Added row_counts for Stage 0 Preview
        "metadata": {
            "traffic": traffic_meta,
            "resource": resource_meta,
            "users": users_meta,
            "valid_count": combined_valid,
            "dropped_count": combined_dropped,
            "gap_count": combined_gaps, # V2.4.2 Total gaps across all metrics
            "gap_count_total": combined_gaps,
            "gap_count_unique": len(set(
                r["timestamp"]
                for r in traffic + resource + users
                if r.get("is_gap")
            )),
            "accuracy_pct": accuracy_pct,
            "gap_analysis": {
                "traffic": traffic_meta.get("gap_analysis"),
                "resource": resource_meta.get("gap_analysis"),
                "users": users_meta.get("gap_analysis"),
            },
            "missing_gaps": sorted(list(set(
                r["timestamp"]
                for r in traffic + resource + users
                if r.get("is_gap")
            )))[:100],  # V2.4.2 Optimization: Deduplicate and limit to first 100 gaps
            "row_counts": row_counts,  # Included in metadata as well
        },
    }


async def get_source_table_detail(
    db: AsyncSession,
    board_id: UUID,
    table_name: str,
    start_time: datetime,
    end_time: datetime,
    limit: int = 1000,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Mengambil data detail dari salah satu dari 6 tabel sumber Mikrotik.
    Mendukung pagination, filter board_id, dan rentang waktu.
    """
    table_map = {
        "board_speed_stats": BoardSpeedStat,
        "board_resource_stats": BoardResourceStat,
        "board_client_stats": BoardClientStat,
        "board_interface_usage": BoardInterfaceUsage,
        "board_pppoe_usage": BoardPppoeUsage,
        "hotspot_usage_raw": HotspotUsageRaw,
    }

    model = table_map.get(table_name)
    if not model:
        raise ValueError(f"Tabel {table_name} tidak valid atau tidak didukung")

    stmt = select(model).where(model.board_id == board_id)

    # Filter Waktu
    if hasattr(model, "log_time"):
        stmt = stmt.where(model.log_time.between(start_time, end_time)).order_by(model.log_time.desc())
    elif hasattr(model, "log_date"):
        stmt = stmt.where(model.log_date.between(start_time.date(), end_time.date())).order_by(model.log_date.desc())

    # Total count untuk pagination info
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    # Apply pagination
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    # Convert rows to dict
    data = [jsonable_encoder(row) for row in rows]

    return {
        "table_name": table_name,
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "data": data,
    }


async def get_latest_data_time(
    db: AsyncSession, board_id: UUID
) -> Dict[str, Optional[datetime]]:
    """
    Mencari timestamp terakhir (max log_time) dari semua tabel sumber untuk router tertentu.
    Digunakan untuk sinkronisasi rentang waktu di frontend (V2.4.1).
    """
    tables_to_check = [
        BoardSpeedStat,
        BoardResourceStat,
        BoardClientStat,
        BoardInterfaceUsage,
        BoardPppoeUsage,
        HotspotUsageRaw,
    ]

    latest_dt: Optional[datetime] = None

    for model in tables_to_check:
        stmt = select(func.max(model.log_time if hasattr(model, "log_time") else model.log_date)).where(
            model.board_id == board_id
        )
        res = await db.execute(stmt)
        val = res.scalar()
        if val:
            # Convert date to datetime if necessary
            if isinstance(val, date) and not isinstance(val, datetime):
                val = datetime.combine(val, datetime.max.time())
            
            # Ensure val is naive for comparison (convert to UTC first)
            if isinstance(val, datetime) and val.tzinfo is not None:
                val = val.astimezone(timezone.utc).replace(tzinfo=None)
            
            if latest_dt is None or val > latest_dt:
                latest_dt = val

    return {"latest_data_time": latest_dt}


__all__ = [
    "run_normalization_preview",
    "get_source_table_detail",
    "_build_timeline",
    "_normalize_traffic",
    "_normalize_resource",
    "_normalize_users",
]
