
import asyncio
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

async def check_db():
    DATABASE_URL = "postgresql+asyncpg://postgres:root@localhost:5432/db_master_mikrotik"
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.connect() as conn:
        # For inspector, we need to sync engine or use run_sync
        def get_tables(connection):
            inspector = inspect(connection)
            return inspector.get_table_names()
        
        tables = await conn.run_sync(get_tables)
        print(f"Tables in DB: {tables}")
        
        if 'alembic_version' in tables:
            res = await conn.execute(text("SELECT version_num FROM alembic_version"))
            version = res.fetchone()
            print(f"Current Alembic version: {version[0] if version else 'Empty'}")
        else:
            print("alembic_version table does not exist")

if __name__ == "__main__":
    asyncio.run(check_db())
