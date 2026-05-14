import logging
import socket

import redis.asyncio as redis
from prometheus_client import Counter, Histogram

from app.core.config import settings

# UPDATE 2.4 - Reliability P2: Logging & Alerting Redis
logger = logging.getLogger("app.db.redis")

# Metrics for Redis Performance & Reliability
REDIS_OP_LATENCY = Histogram(
    "redis_operation_latency_seconds",
    "Latency of Redis operations in seconds",
    ["operation"],
)

REDIS_ERRORS = Counter(
    "redis_errors_total", "Total number of Redis errors", ["operation", "error_type"]
)


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
                self._client = redis.from_url(
                    url, encoding="utf-8", decode_responses=True
                )
            except Exception as e:
                logger.error(f"UPDATE 2.4 - Redis init failed: {e}. Caching disabled.")
                REDIS_ERRORS.labels(operation="init", error_type=type(e).__name__).inc()
                self._client = None
                self._enabled = False

    async def get(self, key: str):
        if not self._client:
            return None
        with REDIS_OP_LATENCY.labels(operation="get").time():
            try:
                return await self._client.get(key)
            except Exception as e:
                if not self._warned:
                    logger.warning(
                        f"UPDATE 2.4 - Redis unavailable (get): {e}. Caching disabled (suppressing further errors)."
                    )
                    self._warned = True
                REDIS_ERRORS.labels(operation="get", error_type=type(e).__name__).inc()
                return None

    async def setex(self, key: str, ttl: int, value: str):
        if not self._client:
            return False
        with REDIS_OP_LATENCY.labels(operation="setex").time():
            try:
                return await self._client.setex(key, ttl, value)
            except Exception as e:
                if not self._warned:
                    logger.warning(
                        f"UPDATE 2.4 - Redis unavailable (setex): {e}. Caching disabled (suppressing further errors)."
                    )
                    self._warned = True
                REDIS_ERRORS.labels(
                    operation="setex", error_type=type(e).__name__
                ).inc()
                return False

    async def delete(self, key: str):
        if not self._client:
            return 0
        with REDIS_OP_LATENCY.labels(operation="delete").time():
            try:
                return await self._client.delete(key)
            except Exception as e:
                if not self._warned:
                    logger.warning(
                        f"UPDATE 2.4 - Redis unavailable (delete): {e}. Caching disabled (suppressing further errors)."
                    )
                    self._warned = True
                REDIS_ERRORS.labels(
                    operation="delete", error_type=type(e).__name__
                ).inc()
                return 0

    async def incr(self, key: str):
        if not self._client:
            return 0
        with REDIS_OP_LATENCY.labels(operation="incr").time():
            try:
                return await self._client.incr(key)
            except Exception as e:
                if not self._warned:
                    logger.warning(
                        f"UPDATE 2.4 - Redis unavailable (incr): {e}. Caching disabled (suppressing further errors)."
                    )
                    self._warned = True
                REDIS_ERRORS.labels(operation="incr", error_type=type(e).__name__).inc()
                return 0

    async def expire(self, key: str, ttl: int):
        if not self._client:
            return False
        with REDIS_OP_LATENCY.labels(operation="expire").time():
            try:
                return await self._client.expire(key, ttl)
            except Exception as e:
                if not self._warned:
                    logger.warning(
                        f"UPDATE 2.4 - Redis unavailable (expire): {e}. Caching disabled (suppressing further errors)."
                    )
                    self._warned = True
                REDIS_ERRORS.labels(
                    operation="expire", error_type=type(e).__name__
                ).inc()
                return False

    async def set(self, key: str, value: str):
        if not self._client:
            return False
        with REDIS_OP_LATENCY.labels(operation="set").time():
            try:
                return await self._client.set(key, value)
            except Exception as e:
                if not self._warned:
                    logger.warning(
                        f"UPDATE 2.4 - Redis unavailable (set): {e}. Caching disabled (suppressing further errors)."
                    )
                    self._warned = True
                REDIS_ERRORS.labels(operation="set", error_type=type(e).__name__).inc()
                return False

    async def ping(self):
        if not self._client:
            return False
        with REDIS_OP_LATENCY.labels(operation="ping").time():
            try:
                return await self._client.ping()
            except Exception as e:
                if not self._warned:
                    logger.warning(
                        f"UPDATE 2.4 - Redis unavailable (ping): {e}. Caching disabled (suppressing further errors)."
                    )
                    self._warned = True
                REDIS_ERRORS.labels(operation="ping", error_type=type(e).__name__).inc()
                return False


# Prefer IPv4 to avoid dual-stack issues; see settings.FINAL_REDIS_URL
host = settings.REDIS_HOST
port = settings.REDIS_PORT
enabled = _can_connect(host, port)
if not enabled:
    print(
        f"⚠️ Redis not reachable at {host}:{port}. Disabling cache layer (SafeRedisClient)."
    )

# Exposed global client used across the app
redis_client = SafeRedisClient(settings.FINAL_REDIS_URL, enabled=enabled)


async def get_redis_client():
    """
    Returns the global Redis client instance (safe wrapper).
    """
    return redis_client
