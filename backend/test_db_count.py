import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres:root@127.0.0.1:5432/db_master_mikrotik"

async def test():
    try:
        engine = create_async_engine(DB_URL)
        AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with AsyncSessionLocal() as session:
            res = await session.execute(text("SELECT count(*) FROM mikrotik_boards"))
            print(f"Board count: {res.scalar()}")
            
            res = await session.execute(text("SELECT board_id, board_name FROM mikrotik_boards LIMIT 5"))
            for row in res.fetchall():
                print(f"Board ID: {row[0]}, Name: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
