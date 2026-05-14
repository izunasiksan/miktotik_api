
import asyncio
import logging
import time
from datetime import datetime, timedelta
from uuid import UUID
import random

from sqlalchemy import text, select, func
from app.core.database import SessionLocal
from app.models.mikrotik import (
    MikrotikBoard, 
    BoardSpeedStat, 
    BoardResourceStat, 
    BoardClientStat,
    BoardInterfaceUsage,
    BoardPppoeUsage,
    HotspotUsageRaw,
    MasterSite, 
    MasterBoardModel
)
from app.models.user import UserBoardAccess
from app.services import analysis_service, normalization_v2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("E2E-Granularity-V24")

async def seed_data(db, board_id: UUID):
    # Ensure dependencies exist
    stmt = select(MasterSite).limit(1)
    res = await db.execute(stmt)
    site = res.scalars().first()
    if not site:
        site = MasterSite(site_name="E2E Granularity Site", location="Test Location")
        db.add(site)
        await db.commit()
        await db.refresh(site)
    
    stmt = select(MasterBoardModel).limit(1)
    res = await db.execute(stmt)
    model = res.scalars().first()
    if not model:
        model = MasterBoardModel(model_name="RB4011", cpu_model="AL21400", core_count=4, total_memory=1024*1024*1024)
        db.add(model)
        await db.commit()
        await db.refresh(model)

    stmt = select(MikrotikBoard).where(MikrotikBoard.board_id == board_id)
    res = await db.execute(stmt)
    board = res.scalars().first()
    if not board:
        board = MikrotikBoard(
            board_id=board_id,
            board_name="Granularity Test Board",
            site_id=site.site_id,
            model_id=model.model_id,
            mac_address="00:11:22:33:44:55",
            ip_address="192.168.88.1"
        )
        db.add(board)
        await db.commit()

    # Seed 3 days of data for better aggregation tests
    # Start: 2026-03-04 00:00:00
    # End:   2026-03-07 00:00:00
    end_time_seed = datetime(2026, 3, 7, 0, 0, 0)
    start_time_seed = datetime(2026, 3, 4, 0, 0, 0)
    
    logger.info(f"Clearing and re-seeding for board {board_id}")
    await db.execute(text(f"DELETE FROM board_speed_stats WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM board_resource_stats WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM board_client_stats WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM board_interface_usage WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM board_pppoe_usage WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM hotspot_usage_raw WHERE board_id = '{board_id}'"))
    await db.commit()
    
    current_time = start_time_seed
    while current_time < end_time_seed: 
        speed_stats = []
        resource_stats = []
        client_stats = []
        
        # 60 samples per hour (1 minute interval)
        for m in range(60):
            log_time = current_time + timedelta(minutes=m)
            if log_time >= end_time_seed: break
            
            speed_stats.append(BoardSpeedStat(
                board_id=board_id,
                interface_name="ether1",
                download_mbps=50.0 + random.uniform(-5, 5),
                upload_mbps=10.0 + random.uniform(-1, 1),
                accuracy_pct=100.0,
                log_time=log_time
            ))
            resource_stats.append(BoardResourceStat(
                board_id=board_id,
                cpu_load=20 + random.randint(0, 10),
                free_memory=512*1024*1024,
                accuracy_pct=100.0,
                log_time=log_time
            ))
            client_stats.append(BoardClientStat(
                board_id=board_id,
                total_hotspot=50 + random.randint(0, 20),
                total_pppoe=100 + random.randint(0, 50),
                accuracy_pct=100.0,
                log_time=log_time
            ))
        
        db.add_all(speed_stats)
        db.add_all(resource_stats)
        db.add_all(client_stats)
        await db.commit()

        # Seed daily usage data (Interface, PPPoE, Hotspot)
        # Only seed if current_time is at the start of the day (00:00:00)
        if current_time.hour == 0 and current_time.minute == 0:
            log_date = current_time.date()
            
            interface_usage = BoardInterfaceUsage(
                board_id=board_id,
                interface_name="ether1",
                total_tx_bytes=random.randint(10**9, 10**10),
                total_rx_bytes=random.randint(10**9, 10**10),
                accuracy_pct=100.0,
                log_date=log_date
            )
            
            pppoe_usage = BoardPppoeUsage(
                board_id=board_id,
                pppoe_username="test_user_pppoe",
                upload_bytes=random.randint(10**8, 10**9),
                download_bytes=random.randint(10**8, 10**9),
                accuracy_pct=100.0,
                log_date=log_date
            )
            
            hotspot_usage = HotspotUsageRaw(
                board_id=board_id,
                username="test_user_hotspot",
                daily_download=random.randint(10**8, 10**9),
                daily_upload=random.randint(10**7, 10**8),
                daily_uptime=3600 * random.randint(1, 10),
                accuracy_pct=100.0,
                log_date=log_date
            )
            
            db.add_all([interface_usage, pppoe_usage, hotspot_usage])
            await db.commit()

        current_time += timedelta(hours=1)
    
    logger.info("Seeding completed with all parameters.")

async def run_granularity_test(granularity: str):
    board_id = UUID("47ed6b9c-216e-4552-94e0-2cf12ff6debc")
    end_time = datetime(2026, 3, 7, 0, 0, 0)
    start_time = end_time - timedelta(days=3)
    
    async with SessionLocal() as db:
        logger.info(f"\n>>> TESTING GRANULARITY: {granularity} <<<")
        
        # STAGE 0
        normalized_data = await normalization_v2.run_normalization_preview(
            db=db, board_id=board_id, start_time=start_time, end_time=end_time,
            granularity=granularity, fill_gaps=True
        )
        logger.info(f"[STAGE 0] Accuracy: {normalized_data['accuracyPct']}%")
        traffic_len = len(normalized_data.get('traffic', []))
        logger.info(f"[STAGE 0] Traffic rows: {traffic_len}")
        
        # STAGE 1
        temp_table = await analysis_service.create_scoped_dataset(
            db=db, board_id=board_id, start_time=start_time, end_time=end_time,
            granularity=granularity, normalized_source=normalized_data
        )
        
        try:
            # STAGE 2
            trend_data = await analysis_service.get_trend_analysis(db, temp_table)
            points = len(trend_data.get("series", []))
            logger.info(f"[STAGE 2] Trend points: {points}")
            
            # STAGE 6
            analytics_data = await analysis_service.get_advanced_analytics(db, temp_table)
            health_score = await analysis_service.calculate_health_score(trend_data, analytics_data)
            logger.info(f"[STAGE 6] Health Score: {health_score['total_score']}")
            
            # Validation logic
            if granularity == "hour":
                expected = 3 * 24 # 3 days * 24 hours
                if abs(points - expected) <= 1:
                    logger.info("[RESULT] SUCCESS: Hour granularity matched expected points.")
                else:
                    logger.error(f"[RESULT] FAILURE: Hour granularity expected ~{expected}, got {points}")
            
            elif granularity == "day":
                expected = 3 # 3 days
                if abs(points - expected) <= 1:
                    logger.info("[RESULT] SUCCESS: Day granularity matched expected points.")
                else:
                    logger.error(f"[RESULT] FAILURE: Day granularity expected ~{expected}, got {points}")

        finally:
            await db.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))
            await db.commit()

async def main():
    board_id = UUID("47ed6b9c-216e-4552-94e0-2cf12ff6debc")
    async with SessionLocal() as db:
        await seed_data(db, board_id)
    
    await run_granularity_test("hour")
    await run_granularity_test("day")

if __name__ == "__main__":
    asyncio.run(main())
