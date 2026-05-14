import redis.asyncio as redis
from app.core.config import settings

# Global Redis Client
# Decode responses=True ensures we get strings, not bytes
redis_client = redis.from_url(settings.FINAL_REDIS_URL, encoding="utf-8", decode_responses=True)

async def get_redis_client():
    """
    Returns the global Redis client instance.
    """
    return redis_client
