from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import date

from app.core.database import get_db
from app.api import deps
from app.models.user import MasterUser
from app.services import analysis_service

import json
from app.db.redis import redis_client
from fastapi.encoders import jsonable_encoder
from datetime import datetime

router = APIRouter()

@router.get("/{board_id}/heavy/", response_model=Dict[str, Any])
async def get_heavy_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get heavy data analysis (P95, Forecasting, Anomaly, Correlation) from backend.
    Frontend should NOT perform these calculations locally.
    """
    # Cache key based on all parameters
    cache_key = f"analysis:heavy:{board_id}:{days}:{start_date}:{end_date}:{granularity}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        print(f"Redis get error: {e}")

    try:
        results = await analysis_service.get_heavy_analysis(db, board_id, days, start_date, end_date, granularity)
        
        # Determine TTL based on granularity
        # historical data (week/month) can be cached longer
        ttl = 3600 # default 1 hour
        if granularity in ['week', 'month']:
            ttl = 86400 # 24 hours
        elif granularity == 'minute':
            ttl = 300 # 5 minutes

        if results:
            try:
                await redis_client.setex(cache_key, ttl, json.dumps(jsonable_encoder(results)))
            except Exception as e:
                print(f"Redis set error: {e}")
        else:
            # Jika results kosong tapi tidak ada error (e.g. data memang tidak ada untuk range tsb)
            results = {
                "percentiles": {"p95_dl": 0, "p99_dl": 0, "p95_ul": 0, "p99_ul": 0, "max_dl": 0, "max_ul": 0},
                "forecast": {"traffic": {"slope": 0, "intercept": 0}, "cpu": {"slope": 0, "intercept": 0}, "memory": {"slope": 0, "intercept": 0}},
                "anomalies": [],
                "correlation": {"pearson_r": 0, "sample_size": 0},
                "health_stats": {"avg_cpu": 0, "peak_cpu": 0, "avg_mem": 0, "resource_alerts": 0, "cpu_usage": 0, "mem_usage": 0, "cpu_p": 0},
                "top_growth_users": []
            }
        return results
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/{board_id}/summary/", response_model=Dict[str, Any])
async def get_analysis_summary(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get quick summary for analysis KPI cards.
    """
    results = await analysis_service.get_dashboard_summary(db, board_id)
    return results

@router.get("/{board_id}/interfaces/", response_model=List[Dict[str, Any]])
async def get_interface_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get per-interface aggregated analysis.
    """
    return await analysis_service.get_interface_analysis(db, board_id, days, pivot_agg, start_date, end_date, granularity)

@router.get("/{board_id}/pppoe/", response_model=List[Dict[str, Any]])
async def get_pppoe_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get per-user PPPoE aggregated analysis.
    """
    return await analysis_service.get_pppoe_analysis(db, board_id, days, pivot_agg, start_date, end_date, granularity)

@router.get("/{board_id}/hotspot/", response_model=List[Dict[str, Any]])
async def get_hotspot_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get per-user Hotspot aggregated analysis.
    """
    return await analysis_service.get_hotspot_analysis(db, board_id, days, pivot_agg, start_date, end_date, granularity)

@router.get("/{board_id}/interfaces/pivot/", response_model=List[Dict[str, Any]])
async def get_interface_pivot(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get interface pivot data (Total Usage per interface).
    """
    return await analysis_service.get_interface_pivot(db, board_id, days, pivot_agg, start_date, end_date, granularity)

@router.get("/{board_id}/pppoe/pivot/", response_model=List[Dict[str, Any]])
async def get_pppoe_pivot(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get PPPoE pivot data (Total Usage per user).
    """
    return await analysis_service.get_pppoe_pivot(db, board_id, days, pivot_agg, start_date, end_date, granularity)

@router.get("/{board_id}/hotspot/pivot/", response_model=List[Dict[str, Any]])
async def get_hotspot_pivot(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get Hotspot pivot data (Total Usage per user).
    """
    return await analysis_service.get_hotspot_pivot(db, board_id, days, pivot_agg, start_date, end_date, granularity)

@router.get("/{board_id}/clients/", response_model=List[Dict[str, Any]])
async def get_clients_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('max', pattern="^(max|avg)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get client counts aggregated analysis.
    """
    return await analysis_service.get_clients_analysis(db, board_id, days, pivot_agg, start_date, end_date, granularity)

def _parse_iso_dt(value: str) -> datetime:
    """
    Validasi dan parse ISO 8601 (menerima 'Z' sebagai UTC).
    """
    if value is None:
        return None
    v = value.strip()
    if v.endswith('Z'):
        v = v.replace('Z', '+00:00')
    try:
        # fromisoformat menerima YYYY-MM-DDTHH:MM:SS[.ffffff][+HH:MM]
        return datetime.fromisoformat(v)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Format waktu tidak valid (harus ISO 8601): {value}")

@router.get("/{board_id}/aggregate/", response_model=List[Dict[str, Any]])
async def time_aggregate(
    board_id: UUID,
    start_time: str,
    end_time: str,
    granularity: str = Query('auto', pattern="^(auto|year|month|day|hour)$"),
    metric: str = Query('download_mbps', pattern="^(download_mbps|upload_mbps|cpu_load|free_memory)$"),
    agg: str = Query('avg', pattern="^(sum|avg|count|min|max)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Agregasi data berbasis waktu dengan granularitas: year, month, day, hour, auto.
    Mendukung fungsi: sum, avg, count, min, max.
    
    Parameter:
    - start_time, end_time: ISO 8601 (contoh: 2026-03-01T00:00:00Z)
    - granularity: auto|year|month|day|hour
    - metric: download_mbps|upload_mbps|cpu_load|free_memory
    - agg: sum|avg|count|min|max
    """
    s_dt = _parse_iso_dt(start_time)
    e_dt = _parse_iso_dt(end_time)
    if e_dt <= s_dt:
        raise HTTPException(status_code=400, detail="end_time harus lebih besar dari start_time")
    
    # Caching
    cache_key = f"analysis:timeagg:{board_id}:{metric}:{agg}:{granularity}:{s_dt.isoformat()}:{e_dt.isoformat()}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        print(f"Redis get error: {e}")
    
    try:
        results = await analysis_service.time_aggregate(
            db=db,
            board_id=board_id,
            metric=metric,
            agg=agg,
            start_time=s_dt,
            end_time=e_dt,
            granularity=granularity
        )
        
        # TTL dinamis
        ttl = 1800  # default 30 menit
        gran = results[0]['granularity'] if results else granularity
        if gran == 'hour':
            ttl = 300
        elif gran == 'day':
            ttl = 1800
        elif gran == 'month':
            ttl = 86400
        elif gran == 'year':
            ttl = 86400 * 7
        
        try:
            await redis_client.setex(cache_key, ttl, json.dumps(jsonable_encoder(results)))
        except Exception as e:
            print(f"Redis set error: {e}")
        return results
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/{board_id}/forecast/interface/{interface_name}", response_model=Dict[str, Any])
async def get_interface_forecast(
    board_id: UUID,
    interface_name: str,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get forecast for a specific interface.
    """
    return await analysis_service.get_interface_forecast(db, board_id, interface_name, days)
