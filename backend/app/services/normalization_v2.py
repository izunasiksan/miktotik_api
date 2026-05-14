# UPDATED v2.4 - INDIKATOR SINKRONISASI
from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timedelta
import math
import logging
import time
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.analysis_service import time_aggregate
from app.core.missing_data_handler import MissingDataHandler, ImputationStrategy
from prometheus_client import Histogram

# Prometheus Metrics for Normalization Performance
NORMALIZATION_LATENCY = Histogram(
    "normalization_latency_seconds",
    "Latency of normalization process in seconds",
    ["stage"]
)

logger = logging.getLogger(__name__)
handler = MissingDataHandler()

def _parse_iso_date(s: str) -> date:
    return date.fromisoformat(s)

def _parse_iso_datetime(s: str) -> datetime:
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return datetime.fromisoformat(s)

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
        return timedelta(days=365)
    if granularity == "month":
        return timedelta(days=31)
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
    while cur < end and guard < 100000:
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
    return pts

def _is_finite_number(x: Any) -> bool:
    try:
        return math.isfinite(float(x))
    except Exception:
        return False

def _normalize_traffic(
    dl_rows: List[Dict[str, Any]],
    ul_rows: List[Dict[str, Any]],
    start: datetime,
    end: datetime,
    granularity: str,
    board_id: UUID,
    usage_unit: str = "Mbps",
    fill_gaps: bool = True
) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    dl_map: Dict[str, Dict[str, Any]] = {}
    ul_map: Dict[str, Dict[str, Any]] = {}
    for r in dl_rows or []:
        p = r.get("period")
        if isinstance(p, str):
            dl_map[p] = r
    for r in ul_rows or []:
        p = r.get("period")
        if isinstance(p, str):
            ul_map[p] = r
            
    keys = set(dl_map.keys()) | set(ul_map.keys())
    dropped = 0
    res: List[Dict[str, Any]] = []
    
    if fill_gaps:
        timeline = _build_timeline(start, end, granularity)
        
        # Phase 1: Collect original values and identify gaps
        raw_rx: List[Optional[float]] = []
        raw_tx: List[Optional[float]] = []
        
        for t in timeline:
            key = _truncate(t, granularity).isoformat()
            dl_data = dl_map.get(key, {})
            ul_data = ul_map.get(key, {})
            
            rx_val = dl_data.get("value")
            tx_val = ul_data.get("value")
            
            raw_rx.append(float(rx_val) if rx_val is not None else None)
            raw_tx.append(float(tx_val) if tx_val is not None else None)
            
        # Phase 2: Missing Data Analysis & Imputation Strategy
        rx_stats = handler.detect_missing_data(raw_rx)
        tx_stats = handler.detect_missing_data(raw_tx)
        
        # V2.1 Compliance: Audit Critical Zone (>30% missing)
        is_critical = rx_stats["status"] == "CRITICAL" or tx_stats["status"] == "CRITICAL"
        
        rx_strategy = handler.select_strategy("traffic_rx", rx_stats["missing_percentage"])
        tx_strategy = handler.select_strategy("traffic_tx", tx_stats["missing_percentage"])
        
        # Phase 3: Apply Imputation
        imputed_rx = handler.handle_missing_data(raw_rx, rx_strategy)
        imputed_tx = handler.handle_missing_data(raw_tx, tx_strategy)
        
        # Phase 4: Final Mapping with Metadata V2.1
        for i, t in enumerate(timeline):
            key = _truncate(t, granularity).isoformat()
            is_gap = key not in keys
            
            rx = imputed_rx[i]
            tx = imputed_tx[i]
            
            dl_data = dl_map.get(key, {})
            ul_data = ul_map.get(key, {})
            
            acc_dl = dl_data.get("accuracy_pct", 100.0)
            acc_ul = ul_data.get("accuracy_pct", 100.0)
            avg_acc = (acc_dl + acc_ul) / 2.0 if not is_gap else 0.0
            
            res.append({
                "timestamp": key,
                "displayDate": key,
                "rx": rx,
                "tx": tx,
                "total": rx + tx,
                "unit": usage_unit,
                "isGap": is_gap,
                "isCritical": is_critical,
                "raw_timestamp": key,
                "source_id": str(board_id),
                "accuracy_pct": avg_acc,
                "imputation_strategy": rx_strategy.value if is_gap else None
            })
    else:
        for k in sorted(keys):
            dl_data = dl_map.get(k, {})
            ul_data = ul_map.get(k, {})
            
            rx = dl_data.get("value", 0.0)
            tx = ul_data.get("value", 0.0)
            
            acc_dl = dl_data.get("accuracy_pct", 100.0)
            acc_ul = ul_data.get("accuracy_pct", 100.0)
            avg_acc = (acc_dl + acc_ul) / 2.0
            
            res.append({
                "timestamp": k,
                "displayDate": k,
                "rx": rx,
                "tx": tx,
                "total": rx + tx,
                "unit": usage_unit,
                "isGap": False,
                # Mandatory Metadata V2.1
                "raw_timestamp": k,
                "source_id": str(board_id),
                "accuracy_pct": avg_acc
            })
    valid = len(res)
    return res, {"validCount": valid, "droppedCount": dropped, "gapCount": sum(1 for r in res if r.get("isGap"))}

def _normalize_resource(
    cpu_rows: List[Dict[str, Any]],
    mem_rows: List[Dict[str, Any]],
    start: datetime,
    end: datetime,
    granularity: str,
    board_id: UUID,
    fill_gaps: bool = True
) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    cpu_map: Dict[str, Dict[str, Any]] = {}
    mem_map: Dict[str, Dict[str, Any]] = {}
    for r in cpu_rows or []:
        p = r.get("period")
        if isinstance(p, str):
            cpu_map[p] = r
    for r in mem_rows or []:
        p = r.get("period")
        if isinstance(p, str):
            mem_map[p] = r
            
    keys = set(cpu_map.keys()) | set(mem_map.keys())
    dropped = 0
    res: List[Dict[str, Any]] = []
    
    if fill_gaps:
        timeline = _build_timeline(start, end, granularity)
        
        # Phase 1: Collect original values
        raw_cpu: List[Optional[float]] = []
        raw_mem: List[Optional[float]] = []
        
        for t in timeline:
            key = _truncate(t, granularity).isoformat()
            cpu_data = cpu_map.get(key, {})
            mem_data = mem_map.get(key, {})
            
            cpu_val = cpu_data.get("value")
            mem_val = mem_data.get("value")
            
            raw_cpu.append(float(cpu_val) if cpu_val is not None else None)
            raw_mem.append(float(mem_val) if mem_val is not None else None)
            
        # Phase 2: Missing Data Analysis
        cpu_stats = handler.detect_missing_data(raw_cpu)
        mem_stats = handler.detect_missing_data(raw_mem)
        
        # V2.1 Compliance: Audit Critical Zone (>30% missing)
        is_critical = cpu_stats["status"] == "CRITICAL" or mem_stats["status"] == "CRITICAL"
        
        cpu_strategy = handler.select_strategy("cpu", cpu_stats["missing_percentage"])
        mem_strategy = handler.select_strategy("memory", mem_stats["missing_percentage"])
        
        # Phase 3: Apply Imputation
        imputed_cpu = handler.handle_missing_data(raw_cpu, cpu_strategy)
        imputed_mem = handler.handle_missing_data(raw_mem, mem_strategy)
        
        # Phase 4: Final Mapping
        for i, t in enumerate(timeline):
            key = _truncate(t, granularity).isoformat()
            is_gap = key not in keys
            
            cpu_val = imputed_cpu[i]
            mem_val = imputed_mem[i]
            
            cpu_data = cpu_map.get(key, {})
            mem_data = mem_map.get(key, {})
            
            acc_cpu = cpu_data.get("accuracy_pct", 100.0)
            acc_mem = mem_data.get("accuracy_pct", 100.0)
            avg_acc = (acc_cpu + acc_mem) / 2.0 if not is_gap else 0.0
            
            res.append({
                "timestamp": key,
                "displayDate": key,
                "cpu_percent_standard": max(0.0, min(float(cpu_val), 100.0)),
                "free_memory": mem_val,
                "mem_usage": None,
                "isGap": is_gap,
                "isCritical": is_critical,
                "raw_timestamp": key,
                "source_id": str(board_id),
                "accuracy_pct": avg_acc,
                "imputation_strategy": cpu_strategy.value if is_gap else None
            })
    else:
        for k in sorted(keys):
            cpu_data = cpu_map.get(k, {})
            mem_data = mem_map.get(k, {})
            
            cpu_val = cpu_data.get("value", 0.0)
            mem_val = mem_data.get("value", 0.0)
            
            acc_cpu = cpu_data.get("accuracy_pct", 100.0)
            acc_mem = mem_data.get("accuracy_pct", 100.0)
            avg_acc = (acc_cpu + acc_mem) / 2.0
            
            res.append({
                "timestamp": k,
                "displayDate": k,
                "cpu_percent_standard": max(0.0, min(float(cpu_val), 100.0)),
                "free_memory": mem_val,
                "mem_usage": None,
                "isGap": False,
                # Mandatory Metadata V2.1
                "raw_timestamp": k,
                "source_id": str(board_id),
                "accuracy_pct": avg_acc
            })
    valid = len(res)
    return res, {"validCount": valid, "droppedCount": dropped, "gapCount": sum(1 for r in res if r.get("isGap"))}

async def run_normalization_preview(
    db: AsyncSession,
    board_id: UUID,
    start_time: datetime,
    end_time: datetime,
    granularity: str = "auto",
    agg: str = "avg",
    bucket_source: str = "server",
    usage_unit: str = "Mbps",
    fill_gaps: bool = True
) -> Dict[str, Any]:
    if end_time <= start_time:
        raise ValueError("end_time must be greater than start_time")
    if granularity not in ["auto", "year", "month", "day", "hour"]:
        raise ValueError("granularity invalid")
    
    start_ts = time.time()
    try:
        dl = await time_aggregate(db, board_id, metric="download_mbps", agg=agg, start_time=start_time, end_time=end_time, granularity=granularity)
        ul = await time_aggregate(db, board_id, metric="upload_mbps", agg=agg, start_time=start_time, end_time=end_time, granularity=granularity)
        cpu = await time_aggregate(db, board_id, metric="cpu_load", agg=agg, start_time=start_time, end_time=end_time, granularity=granularity)
        mem = await time_aggregate(db, board_id, metric="free_memory", agg=agg, start_time=start_time, end_time=end_time, granularity=granularity)
        
        NORMALIZATION_LATENCY.labels(stage="fetch").observe(time.time() - start_ts)
        
        process_ts = time.time()
        traffic, traffic_meta = _normalize_traffic(dl, ul, start_time, end_time, granularity, board_id, usage_unit, fill_gaps)
        resource, resource_meta = _normalize_resource(cpu, mem, start_time, end_time, granularity, board_id, fill_gaps)
        NORMALIZATION_LATENCY.labels(stage="process").observe(time.time() - process_ts)
        
    except Exception as e:
        logger.error(f"normalize fetch failed: {e}")
        raise
    
    meta = {
        "traffic": traffic_meta,
        "resource": resource_meta
    }
    
    total_latency = time.time() - start_ts
    NORMALIZATION_LATENCY.labels(stage="total").observe(total_latency)
    
    # Aggregate metadata for frontend compliance V2.3
    # We take the max of counts to represent the scope
    combined_valid = max(traffic_meta.get("validCount", 0), resource_meta.get("validCount", 0))
    combined_dropped = traffic_meta.get("droppedCount", 0) + resource_meta.get("droppedCount", 0)
    combined_gaps = max(traffic_meta.get("gapCount", 0), resource_meta.get("gapCount", 0))
    
    # Calculate global accuracy percentage
    total_pts = len(traffic)
    accuracy_pct = 100.0
    if total_pts > 0:
        accuracy_pct = round(((total_pts - combined_gaps) / total_pts) * 100, 2)

    return {
        "granularity": granularity,
        "bucketSource": bucket_source,
        "usageUnit": usage_unit,
        "traffic": traffic,
        "resource": resource,
        "accuracy_pct": accuracy_pct,
        "metadata": {
            "traffic": traffic_meta,
            "resource": resource_meta,
            "validCount": combined_valid,
            "droppedCount": combined_dropped,
            "gapCount": combined_gaps,
            "accuracy_pct": accuracy_pct,
            "missing_gaps": [r["timestamp"] for r in traffic if r.get("isGap")]
        }
    }

__all__ = [
    "run_normalization_preview",
    "_build_timeline",
    "_normalize_traffic",
    "_normalize_resource"
]

