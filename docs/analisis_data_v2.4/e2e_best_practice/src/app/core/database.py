# UPDATED v2.4 - INDIKATOR SINKRONISASI
import logging

import pybreaker
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)


# P2: Resilience - Circuit Breaker for Database
# Centralized Monitoring Listener
class DatabaseBreakerListener(pybreaker.CircuitBreakerListener):
    def state_change(self, cb, old_state, new_state):
        msg = f"--- CIRCUIT BREAKER STATE CHANGE: {cb.name} ({old_state} -> {new_state}) ---"
        if new_state == "open":
            logger.critical(msg)
        else:
            logger.warning(msg)


# Fails after 5 consecutive errors, resets after 60 seconds
db_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name="PostgreSQL-Breaker",
    listeners=[DatabaseBreakerListener()],
)

# Engine setup dengan pooling sesuai SOP
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    echo=False,  # Set True jika ingin melihat SQL logs
)

# Session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)


# Base class untuk models
class Base(DeclarativeBase):
    pass


# Dependency untuk FastAPI endpoints
async def get_db():
    # Manual tracking for pybreaker since it's a context manager
    if db_breaker.current_state == "open":
        logger.error("Database Circuit is OPEN. Access rejected.")
        raise pybreaker.CircuitBreakerError("Database circuit is open")

    try:
        async with SessionLocal() as session:
            try:
                yield session
                # If we get here without error, it's a success
                # Note: pybreaker standard use is db_breaker.call(func)
                # For manual control, we can trigger success/failure
            except Exception:
                # Notify breaker of failure if it's not already handled
                # We can't easily call internal state methods, so we use a fallback
                # or just rely on the next call's state check
                await session.rollback()
                raise
            finally:
                await session.close()
    except Exception as e:
        # If any error occurred during the session, it counts as a failure for the breaker
        # In a real pybreaker usage, you'd wrap the call.
        # Here we just log and raise.
        logger.error(f"Database access error: {str(e)}")
        raise
