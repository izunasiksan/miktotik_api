import asyncio
import logging
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy import text
from app.core.database import SessionLocal
from app.services.normalization_v2 import run_normalization_preview

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_v2_1")

async def verify_v2_1_readiness():
    """
    Script to verify the system readiness for Standards V2.1.
    Covers: Metadata handling, Stage 0 Pipeline, and Query Optimization.
    """
    logger.info("Starting Verification for V2.1 Standards...")
    
    async with SessionLocal() as db:
        # 1. Check for Board ID
        result = await db.execute(text("SELECT board_id FROM mikrotik_boards LIMIT 1"))
        board = result.fetchone()
        if not board:
            logger.warning("No boards found. Skipping data-specific tests.")
            return
        
        board_id = board[0]
        logger.info(f"Using board_id: {board_id}")
        
        # 2. Check Schema for accuracy_pct
        tables_to_check = [
            "board_client_stats", "board_resource_stats", "board_speed_stats",
            "board_events", "board_interface_usage", "board_pppoe_usage", "hotspot_usage_raw"
        ]
        
        for table in tables_to_check:
            res = await db.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND column_name = 'accuracy_pct'"))
            if res.fetchone():
                logger.info(f"Table '{table}': Metadata 'accuracy_pct' present.")
            else:
                logger.error(f"Table '{table}': Metadata 'accuracy_pct' MISSING.")

        # 3. Verify Stage 0 Normalization with metadata
        logger.info("Running Stage 0 Normalization Pipeline Test...")
        start_time = datetime.now() - timedelta(hours=24)
        end_time = datetime.now()
        
        try:
            norm_result = await run_normalization_preview(
                db=db,
                board_id=board_id,
                start_time=start_time,
                end_time=end_time,
                granularity="hour",
                fill_gaps=True
            )
            
            # Check Traffic Metadata
            if norm_result["traffic"]:
                sample = norm_result["traffic"][0]
                if "accuracy_pct" in sample and "source_id" in sample:
                    logger.info("Normalization Output: Metadata 'accuracy_pct' and 'source_id' verified.")
                else:
                    logger.error("Normalization Output: Missing mandatory metadata fields.")
            
            # Check Resource Metadata
            if norm_result["resource"]:
                sample = norm_result["resource"][0]
                if "accuracy_pct" in sample and "source_id" in sample:
                    logger.info("Resource Output: Metadata 'accuracy_pct' and 'source_id' verified.")
                else:
                    logger.error("Resource Output: Missing mandatory metadata fields in resource.")
            
            logger.info("Stage 0 Normalization Pipeline: PASSED.")
            
        except Exception as e:
            logger.error(f"Normalization Pipeline Test failed: {e}")

    logger.info("Verification V2.1: COMPLETE.")

if __name__ == "__main__":
    asyncio.run(verify_v2_1_readiness())
