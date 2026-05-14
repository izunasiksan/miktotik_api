from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, Response
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from typing import List, Optional
from datetime import date, timedelta
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
from app.models.mikrotik import BoardDailySummary, BoardMonthlySummary, BoardInterfaceUsage, BoardPppoeUsage, HotspotUsageRaw, BoardClientStat
from app.services.aggregation_service import aggregate_daily_stats, aggregate_monthly_stats
from app.db.redis import redis_client

router = APIRouter()

@router.get("/daily/{board_id}/", response_model=List[dict])
async def get_daily_reports(
    board_id: UUID, 
    limit: Optional[int] = 30,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get daily statistics for a specific board.
    Default limit: last 30 days.
    """
    # Cache key generation
    s_date = start_date.isoformat() if start_date else "None"
    e_date = end_date.isoformat() if end_date else "None"
    cache_key = f"reports:daily:{board_id}:{limit}:{s_date}:{e_date}"
    
    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis error in get_daily_reports (get): {e}")

    query = select(BoardDailySummary).where(BoardDailySummary.board_id == board_id)
    
    if start_date and end_date:
        query = query.where(and_(BoardDailySummary.log_date >= start_date, BoardDailySummary.log_date <= end_date))
    
    query = query.order_by(desc(BoardDailySummary.log_date))
    
    if limit and not (start_date and end_date):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()
    
    # Serialize and cache
    data = jsonable_encoder(summaries)
    # Cache for 1 hour (3600 seconds) as historical reports change infrequently
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(data))
    except Exception as e:
        print(f"Redis error in get_daily_reports (set): {e}")
    
    return data

@router.get("/clients/{board_id}/", response_model=List[dict])
async def get_client_stats(
    board_id: UUID,
    limit: Optional[int] = 200,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get client counts (PPPoE & Hotspot) for a specific board.
    """
    # Cache key generation
    s_date = start_date.isoformat() if start_date else "None"
    e_date = end_date.isoformat() if end_date else "None"
    cache_key = f"reports:clients:{board_id}:{limit}:{s_date}:{e_date}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis error in get_client_stats (get): {e}")

    query = select(BoardClientStat).where(BoardClientStat.board_id == board_id)

    if start_date and end_date:
        # Filter by datetime range for the whole days
        from datetime import datetime, time
        start_dt = datetime.combine(start_date, time(0, 0, 0))
        end_dt = datetime.combine(end_date, time(23, 59, 59))
        query = query.where(and_(BoardClientStat.log_time >= start_dt, BoardClientStat.log_time <= end_dt))

    query = query.order_by(desc(BoardClientStat.log_time))

    if limit and not (start_date and end_date):
        query = query.limit(limit)

    result = await db.execute(query)
    stats = result.scalars().all()

    # Serialize and cache
    data = jsonable_encoder(stats)
    try:
        await redis_client.setex(cache_key, 300, json.dumps(data))
    except Exception as e:
        print(f"Redis error in get_client_stats (set): {e}")

    return data

@router.get("/monthly/{board_id}/", response_model=List[dict])
async def get_monthly_reports(
    board_id: UUID, 
    limit: Optional[int] = 12,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get monthly statistics for a specific board.
    Default limit: last 12 months.
    """
    # Cache key generation
    s_date = start_date.isoformat() if start_date else "None"
    e_date = end_date.isoformat() if end_date else "None"
    cache_key = f"reports:monthly:{board_id}:{limit}:{s_date}:{e_date}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis error in get_monthly_reports (get): {e}")

    query = select(BoardMonthlySummary).where(BoardMonthlySummary.board_id == board_id)
    
    if start_date and end_date:
        # Note: monthly log_month is usually the first day of the month
        query = query.where(and_(BoardMonthlySummary.log_month >= start_date, BoardMonthlySummary.log_month <= end_date))

    query = query.order_by(desc(BoardMonthlySummary.log_month))
    
    if limit and not (start_date and end_date):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()
    
    # Serialize and cache
    data = jsonable_encoder(summaries)
    # Cache for 24 hours (86400 seconds) as monthly reports change very infrequently
    try:
        await redis_client.setex(cache_key, 86400, json.dumps(data))
    except Exception as e:
        print(f"Redis error in get_monthly_reports (set): {e}")
    
    return data

@router.get("/interface/{board_id}/", response_model=List[dict])
async def get_interface_reports(
    board_id: UUID, 
    limit: Optional[int] = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get interface usage statistics for a specific board.
    """
    # Cache key generation
    s_date = start_date.isoformat() if start_date else "None"
    e_date = end_date.isoformat() if end_date else "None"
    cache_key = f"reports:interface:{board_id}:{limit}:{s_date}:{e_date}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis error in get_interface_reports (get): {e}")

    query = select(BoardInterfaceUsage).where(BoardInterfaceUsage.board_id == board_id)
    
    if start_date and end_date:
        query = query.where(and_(BoardInterfaceUsage.log_date >= start_date, BoardInterfaceUsage.log_date <= end_date))
    
    query = query.order_by(desc(BoardInterfaceUsage.log_date))
    
    if limit and not (start_date and end_date):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()
    
    # Serialize and cache
    data = jsonable_encoder(summaries)
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(data))
    except Exception as e:
        print(f"Redis error in get_interface_reports (set): {e}")
    
    return data

@router.get("/pppoe/{board_id}/", response_model=List[dict])
async def get_pppoe_reports(
    board_id: UUID, 
    limit: Optional[int] = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get PPPoE usage statistics for a specific board.
    """
    # Cache key generation
    s_date = start_date.isoformat() if start_date else "None"
    e_date = end_date.isoformat() if end_date else "None"
    cache_key = f"reports:pppoe:{board_id}:{limit}:{s_date}:{e_date}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis error in get_pppoe_reports (get): {e}")

    query = select(BoardPppoeUsage).where(BoardPppoeUsage.board_id == board_id)
    
    if start_date and end_date:
        query = query.where(and_(BoardPppoeUsage.log_date >= start_date, BoardPppoeUsage.log_date <= end_date))
    
    query = query.order_by(desc(BoardPppoeUsage.log_date))
    
    if limit and not (start_date and end_date):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()

    # Serialize and cache
    data = jsonable_encoder(summaries)
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(data))
    except Exception as e:
        print(f"Redis error in get_pppoe_reports (set): {e}")
    
    return data

@router.get("/hotspot/{board_id}/", response_model=List[dict])
async def get_hotspot_reports(
    board_id: UUID, 
    limit: Optional[int] = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Get Hotspot usage statistics for a specific board.
    """
    # Cache key generation
    s_date = start_date.isoformat() if start_date else "None"
    e_date = end_date.isoformat() if end_date else "None"
    cache_key = f"reports:hotspot:{board_id}:{limit}:{s_date}:{e_date}"

    # Try cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis error in get_hotspot_reports (get): {e}")

    query = select(HotspotUsageRaw).where(HotspotUsageRaw.board_id == board_id)
    
    if start_date and end_date:
        query = query.where(and_(HotspotUsageRaw.log_date >= start_date, HotspotUsageRaw.log_date <= end_date))
    
    query = query.order_by(desc(HotspotUsageRaw.log_date))
    
    if limit and not (start_date and end_date):
        query = query.limit(limit)

    result = await db.execute(query)
    summaries = result.scalars().all()

    # Serialize and cache
    data = jsonable_encoder(summaries)
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(data))
    except Exception as e:
        print(f"Redis error in get_hotspot_reports (set): {e}")
    
    return data

@router.post("/trigger-aggregation/")
async def trigger_aggregation(
    background_tasks: BackgroundTasks,
    target_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_active_superuser),
):
    """
    Manually trigger daily and monthly aggregation.
    """
    # 1. Jalankan Agregasi Harian (Blocking agar data harian siap dulu)
    await aggregate_daily_stats(db, target_date)
    
    # 2. Jalankan Agregasi Bulanan (Berdasarkan target_date)
    if target_date:
        year, month = target_date.year, target_date.month
    else:
        # Jika target_date None (default kemarin), ambil bulan dari kemarin
        yesterday = date.today() - timedelta(days=1)
        year, month = yesterday.year, yesterday.month
        
    await aggregate_monthly_stats(db, year, month)
    
    return {
        "message": f"Aggregation for {target_date or 'yesterday'} completed successfully (Daily & Monthly)",
        "status": "success"
    }

@router.get("/export/{board_id}/")
async def export_reports(
    board_id: UUID,
    format: str = Query(..., pattern="^(csv|pdf)$"),
    type: str = Query(..., pattern="^(daily|monthly)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
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
        if start_date and end_date:
            query = query.where(and_(BoardDailySummary.log_date >= start_date, BoardDailySummary.log_date <= end_date))
        query = query.order_by(desc(BoardDailySummary.log_date))
        if limit and not (start_date and end_date):
            query = query.limit(limit)
        result = await db.execute(query)
        data = result.scalars().all()
        filename = f"daily_report_{board_id}_{date.today()}.{format}"
    else:
        query = select(BoardMonthlySummary).where(BoardMonthlySummary.board_id == board_id)
        if start_date and end_date:
            query = query.where(and_(BoardMonthlySummary.log_month >= start_date, BoardMonthlySummary.log_month <= end_date))
        query = query.order_by(desc(BoardMonthlySummary.log_month))
        if limit and not (start_date and end_date):
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
