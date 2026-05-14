
import asyncio
from app.core.database import SessionLocal
from app.models.mikrotik import MikrotikBoard
from app.models.user import UserBoardAccess  # Import to ensure registry knows about it
from sqlalchemy import select

async def list_boards():
    async with SessionLocal() as db:
        result = await db.execute(select(MikrotikBoard))
        boards = result.scalars().all()
        print(f"Found {len(boards)} boards:")
        for board in boards:
            print(f"- {board.board_name} ({board.ip_address}) ID: {board.board_id}")

if __name__ == "__main__":
    asyncio.run(list_boards())
