import asyncio

from sqlalchemy import text

from app.core.database import SessionLocal


async def check_data_count():
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
            try:
                res = await db.execute(text(f"SELECT count(*) FROM {t}"))
                print(f"{t}: {res.scalar()}")
            except Exception as e:
                print(f"{t}: Error {e}")


if __name__ == "__main__":
    asyncio.run(check_data_count())
