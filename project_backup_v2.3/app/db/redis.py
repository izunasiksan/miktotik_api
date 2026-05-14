import redis.asyncio as redis
import socket
from app.core.config import settings


def _can_connect(host: str, port: int, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


class SafeRedisClient:
    """
    Lightweight protective wrapper around redis.asyncio client.
    - If Redis is unreachable, methods become no-ops and return safe defaults.
    - Prevents repeated connection exceptions from spamming logs.
    """
    def __init__(self, url: str | None, enabled: bool):
        self._client = None
        self._enabled = enabled and bool(url)
        self._warned = False
        if self._enabled and url:
            try:
                self._client = redis.from_url(url, encoding="utf-8", decode_responses=True)
            except Exception as e:
                print(f"Redis init failed: {e}. Caching disabled.")
                self._client = None
                self._enabled = False

    async def get(self, key: str):
        if not self._client:
            return None
        try:
            return await self._client.get(key)
        except Exception as e:
            if not self._warned:
                print(f"Redis unavailable (get): {e}. Caching disabled (suppressing further errors).")
                self._warned = True
            return None

    async def setex(self, key: str, ttl: int, value: str):
        if not self._client:
            return False
        try:
            return await self._client.setex(key, ttl, value)
        except Exception as e:
            if not self._warned:
                print(f"Redis unavailable (setex): {e}. Caching disabled (suppressing further errors).")
                self._warned = True
            return False

    async def delete(self, key: str):
        if not self._client:
            return 0
        try:
            return await self._client.delete(key)
        except Exception as e:
            if not self._warned:
                print(f"Redis unavailable (delete): {e}. Caching disabled (suppressing further errors).")
                self._warned = True
            return 0

    async def incr(self, key: str):
        # Return 0 on failure so higher-level logic won't accidentally ban/block
        if not self._client:
            return 0
        try:
            return await self._client.incr(key)
        except Exception as e:
            if not self._warned:
                print(f"Redis unavailable (incr): {e}. Caching disabled (suppressing further errors).")
                self._warned = True
            return 0

    async def expire(self, key: str, ttl: int):
        if not self._client:
            return False
        try:
            return await self._client.expire(key, ttl)
        except Exception as e:
            if not self._warned:
                print(f"Redis unavailable (expire): {e}. Caching disabled (suppressing further errors).")
                self._warned = True
            return False

    async def set(self, key: str, value: str):
        if not self._client:
            return False
        try:
            return await self._client.set(key, value)
        except Exception as e:
            if not self._warned:
                print(f"Redis unavailable (set): {e}. Caching disabled (suppressing further errors).")
                self._warned = True
            return False

    async def ping(self):
        if not self._client:
            return False
        try:
            return await self._client.ping()
        except Exception as e:
            if not self._warned:
                print(f"Redis unavailable (ping): {e}. Caching disabled (suppressing further errors).")
                self._warned = True
            return False


# Prefer IPv4 to avoid dual-stack issues; see settings.FINAL_REDIS_URL
host = settings.REDIS_HOST
port = settings.REDIS_PORT
enabled = _can_connect(host, port)
if not enabled:
    print(f"⚠️ Redis not reachable at {host}:{port}. Disabling cache layer (SafeRedisClient).")

# Exposed global client used across the app
redis_client = SafeRedisClient(settings.FINAL_REDIS_URL, enabled=enabled)


async def get_redis_client():
    """
    Returns the global Redis client instance (safe wrapper).
    """
    return redis_client
