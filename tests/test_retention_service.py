import asyncio
import os
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, delete
from app.core.database import SessionLocal
from app.models.mikrotik import MikrotikBoard, BoardResourceStat, BoardEvent, BoardBackup
import app.models.user # Import to register UserBoardAccess relationship
from app.services.retention_service import prune_resource_stats, prune_events, verify_backups

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_retention")

async def test_retention():
    logger.info("🧪 Starting Retention Service Test...")
    
    async with SessionLocal() as db:
        # 1. Get a board ID
        result = await db.execute(select(MikrotikBoard).limit(1))
        board = result.scalars().first()
        
        if not board:
            logger.warning("⚠️ No boards found in database. Creating a dummy board for testing.")
            board = MikrotikBoard(
                board_name="Test Board",
                mac_address="00:00:00:00:00:00",
                ip_address="192.168.88.1"
            )
            db.add(board)
            await db.commit()
            await db.refresh(board)
            
        board_id = board.board_id
        logger.info(f"📋 Using Board ID: {board_id}")

        # 2. Insert Test Data
        now = datetime.utcnow()
        
        # Resource Stats
        old_stat = BoardResourceStat(board_id=board_id, log_time=now - timedelta(days=35), cpu_load=10)
        new_stat = BoardResourceStat(board_id=board_id, log_time=now - timedelta(days=5), cpu_load=20)
        
        # Events
        old_info_event = BoardEvent(
            board_id=board_id, 
            log_time=now - timedelta(days=100), 
            event_level='info', 
            event_name="Old Info", 
            event_category="system"
        )
        old_critical_event = BoardEvent(
            board_id=board_id, 
            log_time=now - timedelta(days=100), 
            event_level='critical', 
            event_name="Old Critical", 
            event_category="system"
        )
        new_event = BoardEvent(
            board_id=board_id, 
            log_time=now - timedelta(days=5), 
            event_level='info', 
            event_name="New Event", 
            event_category="system"
        )
        
        # Backups
        dummy_backup_file = "test_backup_integrity.rsc"
        with open(dummy_backup_file, "w") as f:
            f.write("") # Empty file
            
        dummy_backup = BoardBackup(
            board_id=board_id,
            file_name="test_backup.rsc",
            file_location=os.path.abspath(dummy_backup_file),
            log_date=now
        )
        
        db.add_all([old_stat, new_stat, old_info_event, old_critical_event, new_event, dummy_backup])
        await db.commit()
        
        # Keep IDs for verification
        old_stat_id = old_stat.resource_id
        new_stat_id = new_stat.resource_id
        old_info_event_id = old_info_event.event_id
        old_critical_event_id = old_critical_event.event_id
        new_event_id = new_event.event_id
        backup_id = dummy_backup.backup_id
        
        logger.info("✅ Test data inserted.")

    # 3. Run Retention Service
    logger.info("🧹 Running Pruning...")
    await prune_resource_stats(days_retention=30)
    await prune_events(days_retention=90)
    
    logger.info("🔍 Running Backup Verification...")
    await verify_backups()

    # 4. Verify Results
    async with SessionLocal() as db:
        # Check Stats
        res_old_stat = await db.get(BoardResourceStat, old_stat_id)
        res_new_stat = await db.get(BoardResourceStat, new_stat_id)
        
        assert res_old_stat is None, "❌ Old Resource Stat should be deleted"
        assert res_new_stat is not None, "❌ New Resource Stat should exist"
        logger.info("✅ Resource Stats Pruning: PASSED")
        
        # Check Events
        res_old_info = await db.get(BoardEvent, old_info_event_id)
        res_old_crit = await db.get(BoardEvent, old_critical_event_id)
        res_new_event = await db.get(BoardEvent, new_event_id)
        
        assert res_old_info is None, "❌ Old Info Event should be deleted"
        assert res_old_crit is not None, "❌ Old Critical Event should exist"
        assert res_new_event is not None, "❌ New Event should exist"
        logger.info("✅ Events Pruning: PASSED")
        
        # Clean up remaining test data
        await db.delete(res_new_stat)
        await db.delete(res_old_crit)
        await db.delete(res_new_event)
        
        # Backup cleanup
        backup = await db.get(BoardBackup, backup_id)
        if backup:
            await db.delete(backup)
        
        await db.commit()
        logger.info("🧹 Test data cleaned up.")

    # Cleanup file
    if os.path.exists(dummy_backup_file):
        os.remove(dummy_backup_file)
        
    logger.info("🎉 All Tests Passed!")

if __name__ == "__main__":
    asyncio.run(test_retention())
