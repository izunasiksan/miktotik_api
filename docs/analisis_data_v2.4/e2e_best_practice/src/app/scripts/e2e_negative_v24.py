
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
from app.models.user import UserBoardAccess
from app.services import analysis_service, normalization_v2
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("E2E-Pipeline-V24-Negative")

async def seed_negative_data(db, board_id: UUID, scenario: str):
    """
    Seed data for different negative scenarios:
    1. 'missing_samples': 40% of data is missing (should drop accuracyPct below 70%)
    2. 'extreme_anomalies': High frequency of spikes (should trigger health alerts)
    3. 'invalid_data': Out of range values (should be handled by normalization)
    """
    logger.info(f"Seeding Negative Data for Scenario: {scenario}")
    
    # Ensure Board exists (assume Site/Model already created by positive test)
    stmt = select(MikrotikBoard).where(MikrotikBoard.board_id == board_id)
    res = await db.execute(stmt)
    board = res.scalars().first()
    if not board:
        # Re-create if missing (simplified)
        site_stmt = select(MasterSite).limit(1)
        site = (await db.execute(site_stmt)).scalars().first()
        model_stmt = select(MasterBoardModel).limit(1)
        model = (await db.execute(model_stmt)).scalars().first()
        
        board = MikrotikBoard(
            board_id=board_id,
            board_name="E2E Negative Test Board",
            site_id=site.site_id,
            model_id=model.model_id,
            mac_address="00:11:22:33:44:66",
            ip_address="192.168.88.2"
        )
        db.add(board)
        await db.commit()

    # Clear existing data
    await db.execute(text(f"DELETE FROM board_speed_stats WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM board_resource_stats WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM board_client_stats WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM board_interface_usage WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM board_pppoe_usage WHERE board_id = '{board_id}'"))
    await db.execute(text(f"DELETE FROM hotspot_usage_raw WHERE board_id = '{board_id}'"))
    await db.commit()

    # Seeding range should be shifted to match the query range interpreted as UTC
    # Since SE Asia is UTC+7, 00:00 local is 17:00 UTC previous day.
    # The query for 2026-03-06 00:00:00 naive will be interpreted as 2026-03-06 00:00:00 UTC.
    # So we should seed starting from 2026-03-06 07:00:00 local (which is 00:00:00 UTC).
    end_time_seed = datetime(2026, 3, 7, 7, 0, 0)
    start_time_seed = end_time_seed - timedelta(days=1)
    
    current_time = start_time_seed
    speed_stats = []
    resource_stats = []
    client_stats = []
    
    while current_time <= end_time_seed:
        # Determine if we should skip this hour for 'missing_samples'
        if scenario == 'missing_samples' and random.random() < 0.4:
            current_time += timedelta(hours=1)
            continue
            
        for minute_offset in range(60):
            # For 'missing_samples', skip some minutes too
            if scenario == 'missing_samples' and random.random() < 0.3:
                continue
                
            log_time = current_time + timedelta(minutes=minute_offset)
            if log_time > end_time_seed:
                break
                
            dl = 50.0
            ul = 10.0
            cpu = 20
            mem_free = 512 * 1024 * 1024
            active_users = 100
            
            if scenario == 'extreme_anomalies':
                # Increase frequency and intensity of spikes to trigger health alerts
                # Use a more predictable pattern to ensure Z-score > 2.0
                # Hour 10: normal, Hour 11: extreme spike, Hour 12: normal...
                is_spike_hour = (current_time.hour % 3 == 0)
                if is_spike_hour:
                    dl = 2000.0 # Extreme spike
                    cpu = 95 # High CPU
                    active_users = 500
                else:
                    dl = 10.0 # Low base for higher Z-score variance
                    cpu = 10
                    active_users = 20
            
            if scenario == 'invalid_data':
                # Force invalid data that should be clamped or rejected
                if random.random() < 0.2:
                    dl = -50.0 # Negative DL
                    cpu = 150   # CPU > 100
                    active_users = -10 # Negative users

            speed_stats.append(BoardSpeedStat(
                board_id=board_id,
                interface_name="ether1",
                download_mbps=dl,
                upload_mbps=ul,
                accuracy_pct=100.0,
                log_time=log_time
            ))
            
            resource_stats.append(BoardResourceStat(
                board_id=board_id,
                cpu_load=int(cpu),
                free_memory=int(mem_free),
                accuracy_pct=100.0,
                log_time=log_time
            ))
            
            client_stats.append(BoardClientStat(
                board_id=board_id,
                total_hotspot=int(active_users * 0.4),
                total_pppoe=int(active_users * 0.6),
                accuracy_pct=100.0,
                log_time=log_time
            ))
            
        # Seed daily usage data (Interface, PPPoE, Hotspot)
        if current_time.hour == 0:
            log_date = current_time.date()
            
            # For 'missing_samples' scenario, we might skip usage too
            if not (scenario == 'missing_samples' and random.random() < 0.4):
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

        # Batch commit every hour
        db.add_all(speed_stats)
        db.add_all(resource_stats)
        db.add_all(client_stats)
        await db.commit()
        speed_stats = []
        resource_stats = []
        client_stats = []
        
        current_time += timedelta(hours=1)
        
    logger.info(f"Seeding completed for scenario: {scenario}")

async def run_negative_test(scenario: str):
    board_id = UUID("47ed6b9c-216e-4552-94e0-2cf12ff6debc")
    # Shift query range to match seeding
    end_time = datetime(2026, 3, 7, 7, 0, 0)
    start_time = end_time - timedelta(days=1)
    
    async with SessionLocal() as db:
        await seed_negative_data(db, board_id, scenario)
        
        logger.info(f"--- RUNNING NEGATIVE SCENARIO: {scenario} ---")
        
        # STAGE 0: Normalization
        normalized_data = await normalization_v2.run_normalization_preview(
            db=db, board_id=board_id, start_time=start_time, end_time=end_time,
            granularity="hour", fill_gaps=True
        )
        
        acc = normalized_data.get('accuracyPct', 0)
        logger.info(f"[STAGE 0] Accuracy: {acc}%")
        
        if scenario == 'missing_samples':
            if acc < 80:
                logger.info("[RESULT] Expected: Low accuracy detected.")
            else:
                logger.warning("[RESULT] Unexpected: Accuracy still high despite missing samples.")

        # STAGE 1: Context Lock
        temp_table = await analysis_service.create_scoped_dataset(
            db=db, board_id=board_id, start_time=start_time, end_time=end_time,
            granularity="hour", normalized_source=normalized_data
        )
        
        try:
            # STAGE 2-5: Analytics
            trend_data = await analysis_service.get_trend_analysis(db, temp_table)
            analytics_data = await analysis_service.get_advanced_analytics(db, temp_table)
            
            # STAGE 6: Health Score
            health_score = await analysis_service.calculate_health_score(trend_data, analytics_data)
            logger.info(f"[STAGE 6] Health Score: {health_score['total_score']}")
            logger.info(f"[STAGE 6] Score Components: {health_score['components']}")
            logger.info(f"[STAGE 6] Analytics for Scoring: Anomaly Count={analytics_data['anomaly']['detected_count']}, Avg CPU={trend_data['summary']['resource']['cpu']['avg']}")
            
            # STAGE 7: Insights
            insights = await analysis_service.generate_insights(trend_data, analytics_data, health_score)
            
            if scenario == 'extreme_anomalies':
                # Check for CRITICAL/WARNING health or anomaly insights
                has_warning = any(ins['level'] in ['CRITICAL', 'WARNING'] for ins in insights)
                if has_warning:
                    logger.info("[RESULT] Expected: Anomalies/High Load triggered health warnings.")
                else:
                    logger.warning("[RESULT] Unexpected: No warnings for extreme anomalies.")
            
            for ins in insights:
                logger.info(f" - [{ins['level']}] {ins['title']}: {ins['message']}")

        finally:
            await db.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))
            await db.commit()

async def main():
    # Run scenarios
    scenarios = ['extreme_anomalies', 'invalid_data', 'missing_samples']
    for s in scenarios:
        await run_negative_test(s)
        print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
