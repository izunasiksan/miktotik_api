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
from app.schemas.mikrotik import (
    HeavyAnalysisResponse, AnalysisKpiSummaryResponse, InterfaceAnalysisItem,
    HotspotAnalysisItem, ClientsAnalysisItem
)

router = APIRouter()

@router.get("/{board_id}/heavy/", response_model=HeavyAnalysisResponse)
async def get_heavy_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get heavy data analysis (P95, Forecasting, Anomaly, Correlation) from backend.
    Frontend should NOT perform these calculations locally.
    """
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")

    # Cache key based on all parameters
    s_time = start_time.isoformat() if start_time else "None"
    e_time = end_time.isoformat() if end_time else "None"
    cache_key = f"analysis:heavy:{board_id}:{days}:{s_time}:{e_time}:{granularity}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return HeavyAnalysisResponse.model_validate(json.loads(cached))
    except Exception as e:
        print(f"Redis get error: {e}")

    try:
        results = await analysis_service.get_heavy_analysis(db, board_id, days, start_time, end_time, granularity)
        
        # Determine TTL based on granularity
        # historical data (week/month) can be cached longer
        ttl = 3600 # default 1 hour
        if granularity in ['week', 'month']:
            ttl = 86400 # 24 hours
        elif granularity == 'minute':
            ttl = 300 # 5 minutes

        if results:
            try:
                # Validate results against schema before caching
                validated_results = HeavyAnalysisResponse.model_validate(results)
                await redis_client.setex(cache_key, ttl, json.dumps(jsonable_encoder(validated_results)))
                return validated_results
            except Exception as e:
                print(f"Redis set or validation error: {e}")
                # Fallback to direct return if validation fails (though it shouldn't)
                return results
        else:
            # Jika results kosong tapi tidak ada error (e.g. data memang tidak ada untuk range tsb)
            empty_results = {
                "actual_granularity": granularity,
                "percentiles": {"p95_dl": 0, "p99_dl": 0, "p95_ul": 0, "p99_ul": 0, "max_dl": 0, "max_ul": 0},
                "forecast": {"traffic": {"slope": 0, "intercept": 0}, "cpu": {"slope": 0, "intercept": 0}, "memory": {"slope": 0, "intercept": 0}},
                "anomalies": [],
                "correlation": {"pearson_r": 0, "sample_size": 0},
                "health_stats": {"avg_cpu": 0, "peak_cpu": 0, "avg_mem": 0, "resource_alerts": 0, "cpu_usage": 0, "mem_usage": 0, "cpu_p": 0},
                "top_growth_users": []
            }
            return HeavyAnalysisResponse.model_validate(empty_results)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/{board_id}/summary/", response_model=AnalysisKpiSummaryResponse)
async def get_analysis_summary(
    board_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get quick summary for analysis KPI cards.
    """
    results = await analysis_service.get_dashboard_summary(db, board_id)
    return AnalysisKpiSummaryResponse.model_validate(results)

@router.get("/{board_id}/interfaces/", response_model=List[InterfaceAnalysisItem])
async def get_interface_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$", alias="pivotAgg"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get per-interface aggregated analysis.
    """
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")
    results = await analysis_service.get_interface_analysis(db, board_id, days, pivot_agg, start_time, end_time, granularity)
    return [InterfaceAnalysisItem.model_validate(item) for item in results]

@router.get("/{board_id}/pppoe/", response_model=List[HotspotAnalysisItem])
async def get_pppoe_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$", alias="pivotAgg"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get per-user PPPoE aggregated analysis.
    """
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")
    results = await analysis_service.get_pppoe_analysis(db, board_id, days, pivot_agg, start_time, end_time, granularity)
    return [HotspotAnalysisItem.model_validate(item) for item in results]

@router.get("/{board_id}/hotspot/", response_model=List[HotspotAnalysisItem])
async def get_hotspot_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$", alias="pivotAgg"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get per-user Hotspot aggregated analysis.
    """
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")
    results = await analysis_service.get_hotspot_analysis(db, board_id, days, pivot_agg, start_time, end_time, granularity)
    return [HotspotAnalysisItem.model_validate(item) for item in results]

@router.get("/{board_id}/interfaces/pivot/", response_model=List[Dict[str, Any]])
async def get_interface_pivot(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$", alias="pivotAgg"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get interface pivot data (Total Usage per interface).
    """
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")
    return await analysis_service.get_interface_pivot(db, board_id, days, pivot_agg, start_time, end_time, granularity)

@router.get("/{board_id}/pppoe/pivot/", response_model=List[Dict[str, Any]])
async def get_pppoe_pivot(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$", alias="pivotAgg"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get PPPoE pivot data (Total Usage per user).
    """
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")
    return await analysis_service.get_pppoe_pivot(db, board_id, days, pivot_agg, start_time, end_time, granularity)

@router.get("/{board_id}/hotspot/pivot/", response_model=List[Dict[str, Any]])
async def get_hotspot_pivot(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('sum', pattern="^(sum|max|avg)$", alias="pivotAgg"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get Hotspot pivot data (Total Usage per user).
    """
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")
    return await analysis_service.get_hotspot_pivot(db, board_id, days, pivot_agg, start_time, end_time, granularity)

@router.get("/{board_id}/clients/", response_model=List[ClientsAnalysisItem])
async def get_clients_analysis(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query('max', pattern="^(max|avg)$", alias="pivotAgg"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    granularity: str = Query('day', pattern="^(minute|hour|day|week|month|auto)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get client counts aggregated analysis.
    """
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")
    results = await analysis_service.get_clients_analysis(db, board_id, days, pivot_agg, start_time, end_time, granularity)
    return [ClientsAnalysisItem.model_validate(item) for item in results]

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

@router.get("/{board_id}/aggregate/", response_model=List[Dict[str, Any]])
async def time_aggregate(
    board_id: UUID,
    start_time: datetime = Query(..., alias="startTime"),
    end_time: datetime = Query(..., alias="endTime"),
    granularity: str = Query('auto', pattern="^(auto|year|month|day|hour)$"),
    metric: str = Query('download_mbps', pattern="^(download_mbps|upload_mbps|cpu_load|free_memory)$"),
    agg: str = Query('avg', pattern="^(sum|avg|count|min|max)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Agregasi data berbasis waktu dengan granularitas: year, month, day, hour, auto.
    Mendukung fungsi: sum, avg, count, min, max.
    
    V2.3: Menggunakan datetime objects langsung dari Query alias.
    """
    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="endTime harus lebih besar dari startTime")
    
    # Caching
    cache_key = f"analysis:timeagg:{board_id}:{metric}:{agg}:{granularity}:{start_time.isoformat()}:{end_time.isoformat()}"
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
            start_time=start_time,
            end_time=end_time,
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
