import asyncio
import logging
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.redis import redis_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def clear_reports_cache():
    try:
        redis = redis_client
        logger.info("Connected to Redis.")
        
        # Scan for keys starting with "reports:"
        keys = []
        cursor = '0'
        while True:
            cursor, batch = await redis.scan(cursor, match="reports:*", count=100)
            keys.extend(batch)
            if cursor == 0 or cursor == '0' or cursor == b'0':
                break
        
        if keys:
            logger.info(f"Found {len(keys)} cache keys to delete.")
            await redis.delete(*keys)
            logger.info("Successfully deleted reports cache keys.")
        else:
            logger.info("No reports cache keys found.")
            
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")

if __name__ == "__main__":
    asyncio.run(clear_reports_cache())
