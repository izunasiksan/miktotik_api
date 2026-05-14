
import sys
import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

async def db_schema_audit():
    print("--- Database Schema Audit Started ---")
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False) # type: ignore
    
    async with async_session() as db: # type: ignore
        # 1. Check for Partitioning
        query_partitions = text("""
            SELECT nmsp_parent.nspname AS parent_schema,
                   rel_parent.relname AS parent_table,
                   nmsp_child.nspname AS child_schema,
                   rel_child.relname AS child_table
            FROM pg_inherits
            JOIN pg_class rel_parent ON pg_inherits.inhparent = rel_parent.oid
            JOIN pg_class rel_child ON pg_inherits.inhrelid = rel_child.oid
            JOIN pg_namespace nmsp_parent ON rel_parent.relnamespace = nmsp_parent.oid
            JOIN pg_namespace nmsp_child ON rel_child.relnamespace = nmsp_child.oid
            WHERE rel_parent.relkind = 'p';
        """)
        res = await db.execute(query_partitions)
        partitions = res.fetchall()
        print(f"Detected {len(partitions)} partition children.")
        
        # 2. Check for Accuracy Pct column
        tables_to_check = ['board_speed_stats', 'board_resource_stats', 'board_client_stats', 'board_daily_summary']
        for table in tables_to_check:
            query_col = text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{table}' AND column_name = 'accuracy_pct';
            """)
            res = await db.execute(query_col)
            col = res.fetchone()
            if col:
                print(f"✅ Table {table} has accuracy_pct column.")
            else:
                print(f"❌ Table {table} is missing accuracy_pct column!")
        
        # 3. Check for Raw Data Fidelity Tables
        required_tables = ['mikrotik_boards', 'board_speed_stats', 'board_resource_stats', 'board_client_stats']
        for table in required_tables:
            query_exists = text(f"SELECT 1 FROM information_schema.tables WHERE table_name = '{table}';")
            res = await db.execute(query_exists)
            exists = res.fetchone()
            if exists:
                print(f"✅ Table {table} exists.")
            else:
                print(f"❌ Table {table} is missing!")

    await engine.dispose()
    print("--- Database Schema Audit Completed ---")

if __name__ == "__main__":
    asyncio.run(db_schema_audit())
