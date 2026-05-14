import asyncio
from sqlalchemy import text
from app.core.database import SessionLocal

async def check_partitioning():
    tables = [
        "board_client_stats", "board_resource_stats", "board_speed_stats",
        "board_events", "board_interface_usage", "board_pppoe_usage", "hotspot_usage_raw"
    ]
    # Correctly format the list for SQL IN clause
    table_list = ", ".join(f"'{t}'" for t in tables)
    query = f"SELECT relname, relkind FROM pg_class WHERE relname IN ({table_list})"
    
    async with SessionLocal() as db:
        res = await db.execute(text(query))
        for row in res:
            # relkind 'p' means partitioned table
            # Some drivers return byte string, so we handle both
            relkind = row[1]
            if isinstance(relkind, bytes):
                relkind = relkind.decode()
            
            kind = "Partitioned" if relkind == 'p' else "Regular"
            print(f"{row[0]}: {kind}")

if __name__ == "__main__":
    asyncio.run(check_partitioning())
