from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings
from app.db.redis import redis_client

# Phase 11: Advanced Rate Limiting Strategy
# Using 'fixed-window' by default, but configured for Redis backend.
# Future improvement: Implement sliding window manually if stricter control needed.

import socket
import logging

logger = logging.getLogger("app.limiter")

def is_redis_available(host: str, port: int) -> bool:
    try:
        # Check if we are in a container/localhost and try to connect
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except (OSError, Exception):
        return False

storage_uri = settings.FINAL_REDIS_URL
# Strict check for Redis availability before using it as storage
# Use memory:// as storage_uri if Redis is unreachable
if "redis" in storage_uri:
    host = settings.REDIS_HOST
    port = settings.REDIS_PORT
    if not is_redis_available(host, port):
        logger.warning(f"⚠️ Redis not reachable at {host}:{port}. Falling back to memory storage for Limiter.")
        storage_uri = "memory://"
    else:
        logger.info(f"✅ Redis connection verified for Limiter at {host}:{port}")
else:
    # If storage_uri doesn't contain 'redis', default to memory
    storage_uri = "memory://"

limiter = Limiter(
    key_func=get_remote_address, 
    storage_uri=storage_uri,
    default_limits=["200/minute", "1000/hour"], # Token Bucket simulation via multiple limits
    strategy="fixed-window" 
)

def get_real_ip(request):
    """
    Helper to get Real IP when behind Reverse Proxy (NGINX/Cloudflare).
    Should be used as key_func in production if behind proxy.
    """
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0]
    return request.client.host

# --- Blacklist Automation (Jail2Ban) ---
async def check_blacklist(ip: str) -> bool:
    """Check if IP is in the blacklist."""
    try:
        is_banned = await redis_client.get(f"blacklist:{ip}")
        return bool(is_banned)
    except Exception:
        # Fail open if Redis is down, don't block legitimate users on error
        return False

async def register_violation(ip: str) -> bool:
    """
    Register a rate limit violation. Ban if threshold exceeded.
    Returns True if the IP is newly banned.
    """
    VIOLATION_KEY = f"violations:{ip}"
    BLACKLIST_KEY = f"blacklist:{ip}"
    MAX_VIOLATIONS = 5       # Max violations before ban
    VIOLATION_WINDOW = 3600  # 1 hour window to accumulate violations
    BAN_DURATION = 86400     # 24 hours ban

    try:
        # Increment violation count
        violations = await redis_client.incr(VIOLATION_KEY)
        
        # Set expiry on first violation
        if violations == 1:
            await redis_client.expire(VIOLATION_KEY, VIOLATION_WINDOW)
        
        # Check threshold
        if violations >= MAX_VIOLATIONS:
            await redis_client.setex(BLACKLIST_KEY, BAN_DURATION, "1")
            return True
            
    except Exception as e:
        print(f"Redis Error in register_violation: {e}")
        pass
        
    return False
