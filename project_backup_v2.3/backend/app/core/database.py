from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
import pybreaker
import logging

logger = logging.getLogger(__name__)

# P2: Resilience - Circuit Breaker for Database
# Fails after 5 consecutive errors, resets after 60 seconds
db_breaker = pybreaker.CircuitBreaker(
    fail_max=5, 
    reset_timeout=60,
    name="PostgreSQL-Breaker"
)

# Engine setup dengan pooling sesuai SOP
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    echo=False, # Set True jika ingin melihat SQL logs
)

# Session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)

# Base class untuk models
class Base(DeclarativeBase):
    pass

# Dependency untuk FastAPI endpoints
async def get_db():
    # Apply circuit breaker to database access
    try:
        async with SessionLocal() as session:
            try:
                # Cek apakah circuit sedang terbuka
                if db_breaker.state == 'open':
                    logger.error("Circuit breaker is OPEN. Database access denied.")
                    raise pybreaker.CircuitBreakerError("Database circuit is open")

                yield session
                # Jika sampai sini tanpa exception, beri tahu breaker (success)
                db_breaker.close()
                await session.commit()
            except Exception as e:
                # Notify breaker of failure jika bukan error circuit itu sendiri
                if not isinstance(e, pybreaker.CircuitBreakerError):
                    db_breaker.open()
                await session.rollback()
                raise
            finally:
                await session.close()
    except pybreaker.CircuitBreakerError:
        logger.critical("Database Circuit Breaker triggered!")
        raise
