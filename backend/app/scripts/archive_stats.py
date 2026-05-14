import asyncio
import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import create_async_engine

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

async def archive_old_stats(days_to_keep=90):
    """
    Archive or delete records older than X days from board_speed_stats and board_resource_stats.
    This helps maintain query performance.
    """
    print(f"--- Archiving Task Started (Keeping last {days_to_keep} days) ---")
    
    engine = create_async_engine(settings.DATABASE_URL)
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    
    async with engine.begin() as conn:
        # 1. Archive/Delete board_speed_stats
        print(f"Cleaning up board_speed_stats older than {cutoff_date}...")
        res_speed = await conn.execute(
            text("DELETE FROM board_speed_stats WHERE log_time < :cutoff"),
            {"cutoff": cutoff_date}
        )
        print(f"Removed {res_speed.rowcount} records from board_speed_stats.")
        
        # 2. Archive/Delete board_resource_stats
        print(f"Cleaning up board_resource_stats older than {cutoff_date}...")
        res_resource = await conn.execute(
            text("DELETE FROM board_resource_stats WHERE log_time < :cutoff"),
            {"cutoff": cutoff_date}
        )
        print(f"Removed {res_resource.rowcount} records from board_resource_stats.")
        
        # 3. Optional: VACUUM ANALYZE to reclaim space and update stats
        # Note: VACUUM cannot run inside a transaction block in some drivers
        # print("Running VACUUM ANALYZE...")
        # await conn.execute(text("VACUUM ANALYZE board_speed_stats"))
        # await conn.execute(text("VACUUM ANALYZE board_resource_stats"))
    
    print("--- Archiving Task Completed Successfully ---")
    await engine.dispose()

if __name__ == "__main__":
    days = 90
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except ValueError:
            pass
    asyncio.run(archive_old_stats(days))
