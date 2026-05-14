import asyncio
from sqlalchemy import text
from app.core.database import SessionLocal

async def get_id():
    async with SessionLocal() as db:
        res = await db.execute(text('SELECT board_id FROM mikrotik_boards'))
        rows = res.fetchall()
        print(f"Found {len(rows)} boards")
        for row in rows:
            print(row[0])

if __name__ == "__main__":
    asyncio.run(get_id())
