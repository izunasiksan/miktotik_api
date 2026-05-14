import asyncio

from sqlalchemy import text

from app.core.database import SessionLocal


async def check_partitioning_details():
    tables = [
        "board_client_stats",
        "board_resource_stats",
        "board_speed_stats",
        "board_events",
        "board_interface_usage",
        "board_pppoe_usage",
        "hotspot_usage_raw",
    ]

    async with SessionLocal() as db:
        for t in tables:
            print(f"\n--- Checking {t} ---")
            # Check relkind
            res = await db.execute(
                text(f"SELECT relkind FROM pg_class WHERE relname = '{t}'")
            )
            row = res.fetchone()
            if row:
                print(f"relkind: {row[0]}")
            else:
                print("Table not found in pg_class")

            # Check partitions
            res = await db.execute(text(f"""
                SELECT
                    nmsp_parent.nspname AS parent_schema,
                    parent.relname      AS parent_name,
                    nmsp_child.nspname  AS child_schema,
                    child.relname       AS child_name
                FROM pg_inherits
                    JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
                    JOIN pg_class child             ON pg_inherits.inhrelid  = child.oid
                    JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid       = parent.relnamespace
                    JOIN pg_namespace nmsp_child    ON nmsp_child.oid        = child.relnamespace
                WHERE parent.relname = '{t}';
            """))
            partitions = res.fetchall()
            if partitions:
                print(f"Partitions found: {len(partitions)}")
                for p in partitions:
                    print(f"  - {p.child_name}")
            else:
                print("No partitions found in pg_inherits")


if __name__ == "__main__":
    asyncio.run(check_partitioning_details())
