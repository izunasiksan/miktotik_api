import asyncio
import asyncpg
import json
from uuid import UUID

async def get_stats():
    conn = await asyncpg.connect('postgresql://postgres:root@localhost:5432/db_master_mikrotik')
    count = await conn.fetchval('SELECT COUNT(*) FROM mikrotik_boards')
    print(f"BOARDS_COUNT: {count}")
    if count > 0:
        row = await conn.fetchrow('SELECT board_id, board_name FROM mikrotik_boards LIMIT 1')
        print(f"BOARD_ID: {row['board_id']}")
        print(f"BOARD_NAME: {row['board_name']}")
        
        speed_count = await conn.fetchval('SELECT COUNT(*) FROM board_speed_stats WHERE board_id = $1', row['board_id'])
        print(f"SPEED_STATS_COUNT: {speed_count}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(get_stats())
