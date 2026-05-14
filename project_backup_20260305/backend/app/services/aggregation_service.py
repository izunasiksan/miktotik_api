from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract, text
from sqlalchemy.dialects.postgresql import insert
from datetime import date, datetime, timedelta
from typing import Optional
from app.models.mikrotik import (
    MikrotikBoard, BoardResourceStat, BoardSpeedStat, 
    BoardClientStat, BoardDailySummary, BoardMonthlySummary,
    HotspotUsageRaw, HotspotUsageMonthly, BoardInterfaceDailySummary
)
import logging

logger = logging.getLogger(__name__)

async def aggregate_daily_stats(db: AsyncSession, target_date: Optional[date] = None):
    """
    Agregasi data dari tabel stats realtime ke tabel daily summary.
    Optimized: Menggunakan Group By dan Bulk Upsert untuk efisiensi (Phase 12).
    """
    if target_date is None:
        target_date = date.today() - timedelta(days=1)
    
    logger.info(f"Starting optimized daily aggregation for {target_date}")

    try:
        # 1. Resource Stats (Group by Board)
        res_stmt = select(
            BoardResourceStat.board_id,
            func.avg(BoardResourceStat.cpu_load).label('avg_cpu'),
            func.max(BoardResourceStat.cpu_load).label('max_cpu'),
            func.min(BoardResourceStat.free_memory).label('min_mem')
        ).where(
            func.date(BoardResourceStat.log_time) == target_date
        ).group_by(BoardResourceStat.board_id)
        
        res_results = await db.execute(res_stmt)
        res_map = {row.board_id: row for row in res_results}

        # 2. Speed Stats (Group by Board)
        speed_stmt = select(
            BoardSpeedStat.board_id,
            func.avg(BoardSpeedStat.download_mbps).label('avg_dl'),
            func.max(BoardSpeedStat.download_mbps).label('max_dl'),
            func.avg(BoardSpeedStat.upload_mbps).label('avg_ul'),
            func.max(BoardSpeedStat.upload_mbps).label('max_ul')
        ).where(
            func.date(BoardSpeedStat.log_time) == target_date
        ).group_by(BoardSpeedStat.board_id)
        
        speed_results = await db.execute(speed_stmt)
        speed_map = {row.board_id: row for row in speed_results}

        # 3. Client Stats (Group by Board)
        client_stmt = select(
            BoardClientStat.board_id,
            func.avg(BoardClientStat.total_hotspot).label('avg_hs'),
            func.max(BoardClientStat.total_hotspot).label('max_hs'),
            func.avg(BoardClientStat.total_pppoe).label('avg_pppoe'),
            func.max(BoardClientStat.total_pppoe).label('max_pppoe')
        ).where(
            func.date(BoardClientStat.log_time) == target_date
        ).group_by(BoardClientStat.board_id)
        
        client_results = await db.execute(client_stmt)
        client_map = {row.board_id: row for row in client_results}

        # 4. Ambil semua board ID untuk memastikan coverage (optional, but good for empty stats)
        board_stmt = select(MikrotikBoard.board_id)
        board_res = await db.execute(board_stmt)
        all_board_ids = board_res.scalars().all()

        # 5. Construct Bulk Data
        upsert_values = []
        for board_id in all_board_ids:
            res_data = res_map.get(board_id)
            speed_data = speed_map.get(board_id)
            client_data = client_map.get(board_id)

            # Skip jika tidak ada data sama sekali untuk board ini
            if not any([res_data, speed_data, client_data]):
                continue

            summary_data = {
                "board_id": board_id,
                "log_date": target_date,
                
                "avg_cpu_load": int(res_data.avg_cpu or 0) if res_data else 0,
                "max_cpu_load": int(res_data.max_cpu or 0) if res_data else 0,
                "min_free_memory": int(res_data.min_mem or 0) if res_data else 0,

                "avg_download": int(speed_data.avg_dl or 0) if speed_data else 0,
                "max_download": int(speed_data.max_dl or 0) if speed_data else 0,
                "avg_upload": int(speed_data.avg_ul or 0) if speed_data else 0,
                "max_upload": int(speed_data.max_ul or 0) if speed_data else 0,

                "avg_hotspot_users": int(client_data.avg_hs or 0) if client_data else 0,
                "max_hotspot_users": int(client_data.max_hs or 0) if client_data else 0,
                "avg_pppoe_users": int(client_data.avg_pppoe or 0) if client_data else 0,
                "max_pppoe_users": int(client_data.max_pppoe or 0) if client_data else 0,
            }
            upsert_values.append(summary_data)

        if upsert_values:
            # 6. Bulk Upsert
            stmt = insert(BoardDailySummary).values(upsert_values)
            update_dict = {
                col.name: col 
                for col in stmt.excluded 
                if col.name not in ['summary_id', 'board_id', 'log_date', 'created_at']
            }
            
            # On Conflict: Update all fields except PK/Unique keys
            upsert_stmt = stmt.on_conflict_do_update(
                index_elements=['board_id', 'log_date'], # Must match UniqueConstraint/Index
                set_=update_dict
            )
            
            await db.execute(upsert_stmt)
            await db.commit()
            logger.info(f"Daily aggregation upserted {len(upsert_values)} records.")
        else:
            logger.info("No data to aggregate for today.")

        # 7. Interface Stats (Group by Board and Interface)
        interface_stmt = select(
            BoardSpeedStat.board_id,
            BoardSpeedStat.interface_name,
            func.avg(BoardSpeedStat.download_mbps).label('avg_dl'),
            func.max(BoardSpeedStat.download_mbps).label('max_dl'),
            func.avg(BoardSpeedStat.upload_mbps).label('avg_ul'),
            func.max(BoardSpeedStat.upload_mbps).label('max_ul'),
        ).where(
            func.date(BoardSpeedStat.log_time) == target_date
        ).group_by(BoardSpeedStat.board_id, BoardSpeedStat.interface_name)

        interface_results = await db.execute(interface_stmt)
        interface_upsert_values = []

        for row in interface_results:
            # 💡 INSIGHT WORKFLOW: P95 Traffic calculation for bottleneck identification
            # 💡 ALUR DATA HISTORI (STEP 6): Menggunakan P95 untuk identifikasi Bottleneck Kapasitas.
            p95_stmt = text("""
                SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY download_mbps)
                FROM board_speed_stats
                WHERE board_id = :board_id 
                AND interface_name = :interface_name 
                AND date(log_time) = :target_date
            """)
            p95_res = await db.execute(p95_stmt, {
                "board_id": row.board_id, 
                "interface_name": row.interface_name, 
                "target_date": target_date
            })
            p95_val = p95_res.scalar() or 0

            interface_upsert_values.append({
                "board_id": row.board_id,
                "interface_name": row.interface_name,
                "log_date": target_date,
                "avg_download_mbps": float(row.avg_dl or 0),
                "max_download_mbps": float(row.max_dl or 0),
                "p95_download_mbps": float(p95_val),
                "avg_upload_mbps": float(row.avg_ul or 0),
                "max_upload_mbps": float(row.max_ul or 0)
            })

        if interface_upsert_values:
            stmt_if = insert(BoardInterfaceDailySummary).values(interface_upsert_values)
            update_dict_if = {
                col.name: col 
                for col in stmt_if.excluded 
                if col.name not in ['summary_id', 'board_id', 'interface_name', 'log_date', 'created_at']
            }
            
            upsert_stmt_if = stmt_if.on_conflict_do_update(
                index_elements=['board_id', 'interface_name', 'log_date'],
                set_=update_dict_if
            )
            
            await db.execute(upsert_stmt_if)
            await db.commit()
            logger.info(f"Interface daily aggregation upserted {len(interface_upsert_values)} records.")

    except Exception as e:
        logger.error(f"Critical Error in daily aggregation: {e}")
        await db.rollback()

async def aggregate_monthly_stats(db: AsyncSession, year: int, month: int):
    """
    Agregasi data dari BoardDailySummary ke BoardMonthlySummary.
    Optimized: Menggunakan Group By dan Bulk Upsert.
    """
    logger.info(f"Starting optimized monthly aggregation for {year}-{month}")
    
    start_date = date(year, month, 1)

    try:
        # Group by Board directly from Daily Summary
        stmt = select(
            BoardDailySummary.board_id,
            func.avg(BoardDailySummary.avg_cpu_load).label('avg_cpu'),
            func.max(BoardDailySummary.max_cpu_load).label('max_cpu'),
            
            func.avg(BoardDailySummary.avg_download).label('avg_dl'),
            func.max(BoardDailySummary.max_download).label('max_dl'),
            func.sum(BoardDailySummary.total_download_bytes).label('sum_dl_bytes'),
            
            func.avg(BoardDailySummary.avg_upload).label('avg_ul'),
            func.max(BoardDailySummary.max_upload).label('max_ul'),
            func.sum(BoardDailySummary.total_upload_bytes).label('sum_ul_bytes'),
            
            func.avg(BoardDailySummary.avg_hotspot_users).label('avg_hs'),
            func.max(BoardDailySummary.max_hotspot_users).label('max_hs')
        ).where(
            and_(
                extract('year', BoardDailySummary.log_date) == year,
                extract('month', BoardDailySummary.log_date) == month
            )
        ).group_by(BoardDailySummary.board_id)

        results = await db.execute(stmt)
        upsert_values = []

        for row in results:
            summary_data = {
                "board_id": row.board_id,
                "log_month": start_date,
                
                "avg_cpu_load": int(row.avg_cpu or 0),
                "max_cpu_load": int(row.max_cpu or 0),
                
                "avg_download": int(row.avg_dl or 0),
                "max_download": int(row.max_dl or 0),
                "total_download_bytes": int(row.sum_dl_bytes or 0),
                
                "avg_upload": int(row.avg_ul or 0),
                "max_upload": int(row.max_ul or 0),
                "total_upload_bytes": int(row.sum_ul_bytes or 0),
                
                "avg_hotspot_users": int(row.avg_hs or 0),
                "max_hotspot_users": int(row.max_hs or 0),
            }
            upsert_values.append(summary_data)

        if upsert_values:
            stmt = insert(BoardMonthlySummary).values(upsert_values)
            update_dict = {
                col.name: col 
                for col in stmt.excluded 
                if col.name not in ['summary_id', 'board_id', 'log_month', 'created_at'] 
            }
            
            upsert_stmt = stmt.on_conflict_do_update(
                index_elements=['board_id', 'log_month'],
                set_=update_dict
            )
            
            await db.execute(upsert_stmt)
            await db.commit()
            logger.info(f"Monthly aggregation upserted {len(upsert_values)} records.")
            
    except Exception as e:
        logger.error(f"Critical Error in monthly aggregation: {e}")
        await db.rollback()

async def aggregate_loyalty_monthly(db: AsyncSession, year: int, month: int):
    """
    Phase 16: Agregasi Loyalty User Bulanan.
    Menghitung total penggunaan & frekuensi login user dalam satu bulan.
    """
    logger.info(f"Starting loyalty aggregation for {year}-{month}")
    
    start_date = date(year, month, 1)

    try:
        # Group by Username from HotspotUsageRaw
        stmt = select(
            HotspotUsageRaw.username,
            func.sum(HotspotUsageRaw.daily_download).label('total_dl'),
            func.sum(HotspotUsageRaw.daily_upload).label('total_ul'),
            func.sum(HotspotUsageRaw.daily_uptime).label('total_time'),
            func.count(func.distinct(HotspotUsageRaw.log_date)).label('freq_days')
        ).where(
            and_(
                extract('year', HotspotUsageRaw.log_date) == year,
                extract('month', HotspotUsageRaw.log_date) == month
            )
        ).group_by(HotspotUsageRaw.username)

        results = await db.execute(stmt)
        upsert_values = []

        for row in results:
            freq_days = int(row.freq_days or 0)
            is_frequent = freq_days >= 10  # Logic bisnis: Loyal jika aktif >= 10 hari
            
            summary_data = {
                "username": row.username,
                "month_period": start_date,
                "total_download": int(row.total_dl or 0),
                "total_upload": int(row.total_ul or 0),
                "total_uptime": int(row.total_time or 0),
                "frequency_days": freq_days,
                "is_frequent_user": is_frequent
            }
            upsert_values.append(summary_data)

        if upsert_values:
            stmt = insert(HotspotUsageMonthly).values(upsert_values)
            update_dict = {
                col.name: col 
                for col in stmt.excluded 
                if col.name not in ['summary_id', 'username', 'month_period']
            }
            
            upsert_stmt = stmt.on_conflict_do_update(
                constraint='unique_user_monthly',
                set_=update_dict
            )
            
            await db.execute(upsert_stmt)
            await db.commit()
            logger.info(f"Loyalty aggregation upserted {len(upsert_values)} users.")
        else:
            logger.info("No user activity found for loyalty aggregation.")

    except Exception as e:
        logger.error(f"Critical Error in loyalty aggregation: {e}")
        await db.rollback()

from app.core.database import SessionLocal

async def run_daily_aggregation_job():
    """
    Wrapper untuk scheduler. Menjalankan agregasi harian.
    """
    logger.info("Scheduler: Starting daily aggregation job")
    async with SessionLocal() as db:
        await aggregate_daily_stats(db)

async def run_monthly_aggregation_job():
    """
    Wrapper untuk scheduler. Menjalankan agregasi bulanan.
    Biasanya dijalankan setiap tanggal 1.
    """
    logger.info("Scheduler: Starting monthly aggregation job")
    today = date.today()
    # Agregasi bulan sebelumnya
    prev_month_date = today.replace(day=1) - timedelta(days=1)
    
    async with SessionLocal() as db:
        await aggregate_monthly_stats(db, prev_month_date.year, prev_month_date.month)
        # Phase 16: Jalankan Loyalty Aggregation juga
        await aggregate_loyalty_monthly(db, prev_month_date.year, prev_month_date.month)
