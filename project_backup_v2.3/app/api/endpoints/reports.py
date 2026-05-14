from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, Response
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from typing import List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID
import csv
import io
import json
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

from app.core.database import get_db
from app.api import deps
from app.models.user import MasterUser
from app.models.mikrotik import BoardDailySummary, BoardMonthlySummary, BoardInterfaceUsage, BoardPppoeUsage, HotspotUsageRaw, BoardClientStat, BoardResourceStat, BoardInterfaceDailySummary
from app.schemas.mikrotik import DailySummaryResponse, MonthlySummaryResponse, ClientStatResponse, ResourceStatResponse, InterfaceDailySummaryResponse, InterfaceUsageResponse, PppoeUsageResponse, HotspotUsageRawResponse
from app.services.aggregation_service import aggregate_daily_stats, aggregate_monthly_stats, aggregate_loyalty_monthly
from app.db.redis import redis_client

router = APIRouter()

@router.get("/daily/{board_id}/", response_model=List[DailySummaryResponse])
async def get_daily_reports(
    board_id: UUID, 
    limit: Optional[int] = 30,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get daily statistics for a specific board.
    Default limit: last 30 days.
    """
    # Cache key generation
    s_time = start_time.isoformat() if start_time else "None"
    e_time = end_time.isoformat() if end_time else "None"
    cache_key = f"reports:daily:{board_id}:{limit}:{s_time}:{e_time}"
    
    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return [DailySummaryResponse.model_validate(item) for item in json.loads(cached_data)]
    except Exception as e:
        print(f"Redis error in get_daily_reports (get): {e}")

    query = select(BoardDailySummary).where(BoardDailySummary.board_id == board_id)
    
    if start_time and end_time:
        query = query.where(and_(BoardDailySummary.log_date >= start_time.date(), BoardDailySummary.log_date <= end_time.date()))
    
    query = query.order_by(desc(BoardDailySummary.log_date))
    
    if limit and not (start_time and end_time):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()
    
    # Serialize and cache
    # Use schema for consistent camelCase serialization
    data = [DailySummaryResponse.model_validate(s).model_dump(by_alias=True) for s in summaries]
    # Cache for 1 hour (3600 seconds) as historical reports change infrequently
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(jsonable_encoder(data)))
    except Exception as e:
        print(f"Redis error in get_daily_reports (set): {e}")
    
    return summaries

@router.get("/clients/{board_id}/", response_model=List[ClientStatResponse])
async def get_client_stats(
    board_id: UUID,
    limit: Optional[int] = 200,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get client counts (PPPoE & Hotspot) for a specific board.
    """
    # Cache key generation
    s_time = start_time.isoformat() if start_time else "None"
    e_time = end_time.isoformat() if end_time else "None"
    cache_key = f"reports:clients:{board_id}:{limit}:{s_time}:{e_time}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return [ClientStatResponse.model_validate(item) for item in json.loads(cached_data)]
    except Exception as e:
        print(f"Redis error in get_client_stats (get): {e}")

    query = select(BoardClientStat).where(BoardClientStat.board_id == board_id)

    if start_time and end_time:
        query = query.where(and_(BoardClientStat.log_time >= start_time, BoardClientStat.log_time <= end_time))

    query = query.order_by(desc(BoardClientStat.log_time))

    if limit and not (start_time and end_time):
        query = query.limit(limit)

    result = await db.execute(query)
    stats = result.scalars().all()

    # Serialize and cache
    data = [ClientStatResponse.model_validate(s).model_dump(by_alias=True) for s in stats]
    try:
        await redis_client.setex(cache_key, 300, json.dumps(jsonable_encoder(data)))
    except Exception as e:
        print(f"Redis error in get_client_stats (set): {e}")

    return stats

@router.get("/monthly/{board_id}/", response_model=List[MonthlySummaryResponse])
async def get_monthly_reports(
    board_id: UUID, 
    limit: Optional[int] = 12,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get monthly statistics for a specific board.
    Default limit: last 12 months.
    """
    # Cache key generation
    s_time = start_time.isoformat() if start_time else "None"
    e_time = end_time.isoformat() if end_time else "None"
    cache_key = f"reports:monthly:{board_id}:{limit}:{s_time}:{e_time}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return [MonthlySummaryResponse.model_validate(item) for item in json.loads(cached_data)]
    except Exception as e:
        print(f"Redis error in get_monthly_reports (get): {e}")

    query = select(BoardMonthlySummary).where(BoardMonthlySummary.board_id == board_id)

    if start_time and end_time:
        query = query.where(and_(BoardMonthlySummary.log_month >= start_time.date(), BoardMonthlySummary.log_month <= end_time.date()))

    query = query.order_by(desc(BoardMonthlySummary.log_month))

    if limit and not (start_time and end_time):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()

    # Serialize and cache
    data = [MonthlySummaryResponse.model_validate(s).model_dump(by_alias=True) for s in summaries]
    try:
        await redis_client.setex(cache_key, 86400, json.dumps(jsonable_encoder(data))) # Monthly reports can be cached longer
    except Exception as e:
        print(f"Redis error in get_monthly_reports (set): {e}")

    return summaries

@router.get("/interface/{board_id}/", response_model=List[InterfaceUsageResponse])
async def get_interface_reports(
    board_id: UUID, 
    limit: Optional[int] = 100,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get interface usage statistics for a specific board.
    """
    # Cache key generation
    s_time = start_time.isoformat() if start_time else "None"
    e_time = end_time.isoformat() if end_time else "None"
    cache_key = f"reports:interface:{board_id}:{limit}:{s_time}:{e_time}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return [InterfaceUsageResponse.model_validate(item) for item in json.loads(cached_data)]
    except Exception as e:
        print(f"Redis error in get_interface_reports (get): {e}")

    query = select(BoardInterfaceUsage).where(BoardInterfaceUsage.board_id == board_id)
    
    if start_time and end_time:
        query = query.where(and_(BoardInterfaceUsage.log_date >= start_time.date(), BoardInterfaceUsage.log_date <= end_time.date()))
    
    query = query.order_by(desc(BoardInterfaceUsage.log_date))
    
    if limit and not (start_time and end_time):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()
    
    # Serialize and cache
    data = [InterfaceUsageResponse.model_validate(s).model_dump(by_alias=True) for s in summaries]
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(jsonable_encoder(data)))
    except Exception as e:
        print(f"Redis error in get_interface_reports (set): {e}")
    
    return summaries

@router.get("/pppoe/{board_id}/", response_model=List[PppoeUsageResponse])
async def get_pppoe_reports(
    board_id: UUID, 
    limit: Optional[int] = 100,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get PPPoE usage statistics for a specific board.
    """
    # Cache key generation
    s_time = start_time.isoformat() if start_time else "None"
    e_time = end_time.isoformat() if end_time else "None"
    cache_key = f"reports:pppoe:{board_id}:{limit}:{s_time}:{e_time}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return [PppoeUsageResponse.model_validate(item) for item in json.loads(cached_data)]
    except Exception as e:
        print(f"Redis error in get_pppoe_reports (get): {e}")

    query = select(BoardPppoeUsage).where(BoardPppoeUsage.board_id == board_id)
    
    if start_time and end_time:
        query = query.where(and_(BoardPppoeUsage.log_date >= start_time.date(), BoardPppoeUsage.log_date <= end_time.date()))
    
    query = query.order_by(desc(BoardPppoeUsage.log_date))
    
    if limit and not (start_time and end_time):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()
    
    # Serialize and cache
    data = [PppoeUsageResponse.model_validate(s).model_dump(by_alias=True) for s in summaries]
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(jsonable_encoder(data)))
    except Exception as e:
        print(f"Redis error in get_pppoe_reports (set): {e}")
    
    return summaries

@router.get("/hotspot/{board_id}/", response_model=List[HotspotUsageRawResponse])
async def get_hotspot_reports(
    board_id: UUID, 
    limit: Optional[int] = 100,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get Hotspot usage statistics for a specific board.
    """
    # Cache key generation
    s_time = start_time.isoformat() if start_time else "None"
    e_time = end_time.isoformat() if end_time else "None"
    cache_key = f"reports:hotspot:{board_id}:{limit}:{s_time}:{e_time}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return [HotspotUsageRawResponse.model_validate(item) for item in json.loads(cached_data)]
    except Exception as e:
        print(f"Redis error in get_hotspot_reports (get): {e}")

    query = select(HotspotUsageRaw).where(HotspotUsageRaw.board_id == board_id)
    
    if start_time and end_time:
        query = query.where(and_(HotspotUsageRaw.log_date >= start_time.date(), HotspotUsageRaw.log_date <= end_time.date()))
    
    query = query.order_by(desc(HotspotUsageRaw.log_date))
    
    if limit and not (start_time and end_time):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()
    
    # Serialize and cache
    data = [HotspotUsageRawResponse.model_validate(s).model_dump(by_alias=True) for s in summaries]
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(jsonable_encoder(data)))
    except Exception as e:
        print(f"Redis error in get_hotspot_reports (set): {e}")
    
    return summaries

@router.post("/trigger-aggregation/")
async def trigger_aggregation(
    background_tasks: BackgroundTasks,
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
):
    """
    Manually trigger daily and monthly aggregation.
    V2.3: Menggunakan datetime parameters untuk presisi filter.
    """
    # 1. Jalankan Agregasi Harian (Blocking agar data harian siap dulu)
    await aggregate_daily_stats(db, start_time, end_time)
    
    # 2. Jalankan Agregasi Bulanan & Loyalty (Berdasarkan range yang sama)
    await aggregate_monthly_stats(db, start_time=start_time, end_time=end_time)
    await aggregate_loyalty_monthly(db, start_time=start_time, end_time=end_time)
    
    return {
        "message": f"Aggregation for {start_time or 'default range'} completed successfully (Daily, Monthly & Loyalty)",
        "status": "success"
    }

@router.get("/export/{board_id}/")
async def export_reports(
    board_id: UUID,
    format: str = Query(..., pattern="^(csv|pdf)$"),
    type: str = Query(..., pattern="^(daily|monthly)$"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    limit: Optional[int] = 30,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Export reports to CSV or PDF.
    """
    # Reuse the logic from get_daily/monthly_reports but return raw data
    if type == "daily":
        query = select(BoardDailySummary).where(BoardDailySummary.board_id == board_id)
        if start_time and end_time:
            query = query.where(and_(BoardDailySummary.log_date >= start_time.date(), BoardDailySummary.log_date <= end_time.date()))
        query = query.order_by(desc(BoardDailySummary.log_date))
        if limit and not (start_time and end_time):
            query = query.limit(limit)
        result = await db.execute(query)
        data = result.scalars().all()
        filename = f"daily_report_{board_id}_{date.today()}.{format}"
    else:
        query = select(BoardMonthlySummary).where(BoardMonthlySummary.board_id == board_id)
        if start_time and end_time:
            query = query.where(and_(BoardMonthlySummary.log_month >= start_time.date(), BoardMonthlySummary.log_month <= end_time.date()))
        query = query.order_by(desc(BoardMonthlySummary.log_month))
        if limit and not (start_time and end_time):
            query = query.limit(limit)
        result = await db.execute(query)
        data = result.scalars().all()
        filename = f"monthly_report_{board_id}_{date.today()}.{format}"

    if not data:
        raise HTTPException(status_code=404, detail="No data found for export")

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        headers = [c.name for c in data[0].__table__.columns]
        writer.writerow(headers)
        
        # Data
        for row in data:
            writer.writerow([getattr(row, col) for col in headers])
            
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif format == "pdf":
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        elements.append(Paragraph(f"{type.capitalize()} Report for Board {board_id}", styles['Title']))
        elements.append(Paragraph(f"Generated on: {date.today()}", styles['Normal']))
        
        # Table Data
        # Select specific columns for PDF to fit width
        if type == "daily":
            columns = ["log_date", "avg_cpu_load", "avg_memory_usage", "avg_temp", "avg_download", "avg_upload"]
        else:
            columns = ["log_month", "avg_cpu_load", "avg_memory_usage", "avg_temp", "avg_download", "avg_upload"]
            
        table_data = [columns]
        for row in data:
            row_data = []
            for col in columns:
                val = getattr(row, col)
                if isinstance(val, (float, int)) and col not in ["log_date", "log_month"]:
                     val = round(val, 2)
                row_data.append(str(val))
            table_data.append(row_data)

        # Table Style
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(table)
        doc.build(elements)
        
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
