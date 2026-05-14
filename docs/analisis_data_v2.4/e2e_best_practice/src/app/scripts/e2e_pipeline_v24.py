
import asyncio
import logging
import time
from datetime import datetime, timedelta
from uuid import UUID
import random

from sqlalchemy import text, select, func
from app.core.database import SessionLocal, engine
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
from app.models.user import UserBoardAccess  # Import ini untuk mendaftarkan mapper UserBoardAccess
from app.services import analysis_service, normalization_v2
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("E2E-Pipeline-V24")

async def seed_data(db, board_id: UUID):
    # 1. Ensure Site exists
    stmt = select(MasterSite).limit(1)
    res = await db.execute(stmt)
    site = res.scalars().first()
    if not site:
        site = MasterSite(site_name="E2E Test Site", location="Test Location")
        db.add(site)
        await db.commit()
        await db.refresh(site)
    
    # 2. Ensure Model exists
    stmt = select(MasterBoardModel).limit(1)
    res = await db.execute(stmt)
    model = res.scalars().first()
    if not model:
        model = MasterBoardModel(model_name="RB4011", cpu_model="AL21400", core_count=4, total_memory=1024*1024*1024)
        db.add(model)
        await db.commit()
        await db.refresh(model)

    # 3. Ensure Board exists
    stmt = select(MikrotikBoard).where(MikrotikBoard.board_id == board_id)
    res = await db.execute(stmt)
    board = res.scalars().first()
    if not board:
        logger.info(f"Creating board {board_id}")
        board = MikrotikBoard(
            board_id=board_id,
            board_name="E2E Test Board",
            site_id=site.site_id,
            model_id=model.model_id,
            mac_address="00:11:22:33:44:55",
            ip_address="192.168.88.1"
        )
        db.add(board)
        await db.commit()
    
    # Generate 2 days of data
    # We'll generate data for 2026-03-05 to 2026-03-07
    end_time_seed = datetime(2026, 3, 7, 0, 0, 0)
    start_time_seed = end_time_seed - timedelta(days=2)
    
    # Check if data already exists
    stmt = select(func.count()).select_from(BoardSpeedStat).where(BoardSpeedStat.board_id == board_id)
    res = await db.execute(stmt)
    count = res.scalar()
    
    if count < 100 or True: # Force re-seed for better pattern
        logger.info(f"Clearing existing stats and re-seeding for board {board_id}")
        await db.execute(text(f"DELETE FROM board_speed_stats WHERE board_id = '{board_id}'"))
        await db.execute(text(f"DELETE FROM board_resource_stats WHERE board_id = '{board_id}'"))
        await db.execute(text(f"DELETE FROM board_client_stats WHERE board_id = '{board_id}'"))
        await db.execute(text(f"DELETE FROM board_interface_usage WHERE board_id = '{board_id}'"))
        await db.execute(text(f"DELETE FROM board_pppoe_usage WHERE board_id = '{board_id}'"))
        await db.execute(text(f"DELETE FROM hotspot_usage_raw WHERE board_id = '{board_id}'"))
        await db.commit()
        
        current_time = start_time_seed
        speed_stats = []
        resource_stats = []
        client_stats = []
        
        while current_time <= end_time_seed:
            # Random values with some patterns
            hour = current_time.hour
            
            # Higher traffic in evening (18-22)
            # Normal range 0.1 - 200 Mbps
            if 18 <= hour <= 22:
                base_traffic = 150 + random.uniform(0, 40)
                active_users = 150 + random.randint(0, 50)
            else:
                base_traffic = 20 + random.uniform(0, 30)
                active_users = 30 + random.randint(0, 20)
            
            # Add some spikes (Anomaly)
            if random.random() < 0.05: # 5% chance of spike
                base_traffic += 100
                
            dl = base_traffic
            ul = (base_traffic / 8) + random.uniform(0, 2)
            
            # Correlation: CPU should follow DL traffic
            cpu = 10 + (dl / 5) + random.uniform(0, 5)
            if cpu > 100: cpu = 99
            
            # Memory usage increases with traffic
            mem_total = 1024 * 1024 * 1024
            mem_free = mem_total - (200 * 1024 * 1024) - (dl * 1024 * 1024 / 10)
            
            speed_stats.append(BoardSpeedStat(
                board_id=board_id,
                interface_name="ether1",
                download_mbps=dl,
                upload_mbps=ul,
                accuracy_pct=100.0,
                log_time=current_time
            ))
            resource_stats.append(BoardResourceStat(
                board_id=board_id,
                cpu_load=int(cpu),
                free_memory=int(mem_free),
                accuracy_pct=100.0,
                log_time=current_time
            ))
            client_stats.append(BoardClientStat(
                board_id=board_id,
                total_hotspot=int(active_users * 0.4),
                total_pppoe=int(active_users * 0.6),
                accuracy_pct=100.0,
                log_time=current_time
            ))
            
            # Seed daily usage data (Interface, PPPoE, Hotspot)
            if current_time.hour == 0 and current_time.minute == 0:
                log_date = current_time.date()
                
                db.add(BoardInterfaceUsage(
                    board_id=board_id,
                    interface_name="ether1",
                    total_tx_bytes=random.randint(10**9, 10**10),
                    total_rx_bytes=random.randint(10**9, 10**10),
                    accuracy_pct=100.0,
                    log_date=log_date
                ))
                
                db.add(BoardPppoeUsage(
                    board_id=board_id,
                    pppoe_username="test_user_pppoe",
                    upload_bytes=random.randint(10**8, 10**9),
                    download_bytes=random.randint(10**8, 10**9),
                    accuracy_pct=100.0,
                    log_date=log_date
                ))
                
                db.add(HotspotUsageRaw(
                    board_id=board_id,
                    username="test_user_hotspot",
                    daily_download=random.randint(10**8, 10**9),
                    daily_upload=random.randint(10**7, 10**8),
                    daily_uptime=3600 * random.randint(1, 10),
                    accuracy_pct=100.0,
                    log_date=log_date
                ))

            # Move to next hour
            current_time += timedelta(hours=1)
            
            # Batch commit every 24 samples
            if len(speed_stats) >= 24:
                db.add_all(speed_stats)
                db.add_all(resource_stats)
                db.add_all(client_stats)
                await db.commit()
                speed_stats = []
                resource_stats = []
                client_stats = []
        
        # Final commit
        if speed_stats:
            db.add_all(speed_stats)
            db.add_all(resource_stats)
            db.add_all(client_stats)
            await db.commit()
            
        logger.info("Seeding completed with all parameters.")

async def run_e2e_test():
    board_id = UUID("47ed6b9c-216e-4552-94e0-2cf12ff6debc")
    end_time = datetime(2026, 3, 7, 0, 0, 0)
    start_time = end_time - timedelta(days=2)
    
    async with SessionLocal() as db:
        await seed_data(db, board_id)
        
        logger.info(f"Starting E2E Pipeline Test for {board_id}")
        logger.info(f"Range: {start_time} to {end_time}")
        
        start_ts = time.time()
        
        # STAGE 0: Normalization
        logger.info("[STAGE 0] Running Normalization...")
        normalized_data = await normalization_v2.run_normalization_preview(
            db=db,
            board_id=board_id,
            start_time=start_time,
            end_time=end_time,
            granularity="hour",
            fill_gaps=True
        )
        assert "traffic" in normalized_data
        assert "resource" in normalized_data
        logger.info(f"[STAGE 0] Success. Accuracy: {normalized_data['accuracyPct']}%")
        
        # STAGE 1: Context Lock
        logger.info("[STAGE 1] Creating Scoped Dataset...")
        temp_table = await analysis_service.create_scoped_dataset(
            db=db,
            board_id=board_id,
            start_time=start_time,
            end_time=end_time,
            granularity="hour",
            normalized_source=normalized_data
        )
        assert temp_table.startswith("temp_scoped_")
        logger.info(f"[STAGE 1] Success. Temp Table: {temp_table}")
        
        try:
            # STAGE 2: Trend
            logger.info("[STAGE 2] Calculating Trend...")
            trend_data = await analysis_service.get_trend_analysis(db, temp_table)
            assert "series" in trend_data
            assert len(trend_data["series"]) > 0
            logger.info(f"[STAGE 2] Success. Points: {len(trend_data['series'])}")
            
            # STAGE 3-5: Analytics
            logger.info("[STAGE 3-5] Running Advanced Analytics...")
            analytics_data = await analysis_service.get_advanced_analytics(db, temp_table)
            assert "correlation" in analytics_data
            assert "habit" in analytics_data
            assert "anomaly" in analytics_data
            logger.info(f"[STAGE 3-5] Success. Correlation RX vs CPU: {analytics_data['correlation']['rx_vs_cpu']}")
            
            # STAGE 6: Health Score
            logger.info("[STAGE 6] Calculating Health Score...")
            health_score = await analysis_service.calculate_health_score(trend_data, analytics_data)
            assert "total_score" in health_score
            logger.info(f"[STAGE 6] Success. Total Score: {health_score['total_score']}")
            
            # STAGE 7: Insights
            logger.info("[STAGE 7] Generating Insights...")
            insights = await analysis_service.generate_insights(trend_data, analytics_data, health_score)
            assert isinstance(insights, list)
            logger.info(f"[STAGE 7] Success. Generated {len(insights)} insights.")
            for ins in insights:
                logger.info(f" - [{ins['level']}] {ins['title']}: {ins['message']}")
                
        finally:
            logger.info(f"Cleaning up temp table {temp_table}")
            await db.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))
            await db.commit()
            
        total_duration = time.time() - start_ts
        logger.info(f"E2E Pipeline Test Completed in {total_duration:.2f} seconds.")
        
        # Performance Check
        if total_duration < 5.0:
            logger.info("Performance: EXCELLENT (< 5s)")
        elif total_duration < 15.0:
            logger.info("Performance: GOOD (< 15s)")
        else:
            logger.warning("Performance: SLOW (> 15s)")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
