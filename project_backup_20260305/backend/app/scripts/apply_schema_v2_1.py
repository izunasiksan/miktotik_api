import asyncio
import logging
from sqlalchemy import text
from app.core.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("apply_schema_v2_1")

async def apply_schema_updates():
    tables = [
        "board_client_stats", "board_resource_stats", "board_speed_stats",
        "board_events", "board_interface_usage", "board_pppoe_usage", "hotspot_usage_raw"
    ]
    
    async with SessionLocal() as db:
        for table in tables:
            try:
                # Add accuracy_pct column if it doesn't exist
                await db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS accuracy_pct NUMERIC(5, 2) DEFAULT 100.00"))
                logger.info(f"Updated table {table}: Added accuracy_pct")
            except Exception as e:
                logger.error(f"Failed to update table {table}: {e}")
        
        await db.commit()
    logger.info("Schema updates applied successfully.")

if __name__ == "__main__":
    asyncio.run(apply_schema_updates())
