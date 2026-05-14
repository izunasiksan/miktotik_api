import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Configuration
DB_URL = "postgresql+asyncpg://postgres:root@localhost:5432/db_master_mikrotik"

async def cleanup_boards():
    engine = create_async_engine(DB_URL, echo=True)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        print("--- DATABASE CLEANUP IN PROGRESS ---")
        
        # Deleting from the main table will cascade to all other tables (stats, logs, summaries, etc.)
        # due to ON DELETE CASCADE constraints in the database schema.
        try:
            print("Executing: DELETE FROM mikrotik_boards...")
            result = await session.execute(text("DELETE FROM mikrotik_boards"))
            rows_deleted = result.rowcount
            
            await session.commit()
            print(f"Successfully deleted {rows_deleted} boards and all their cascaded data.")
            print("--- CLEANUP COMPLETED ---")
        except Exception as e:
            await session.rollback()
            print(f"ERROR: Cleanup failed. {str(e)}")
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(cleanup_boards())
