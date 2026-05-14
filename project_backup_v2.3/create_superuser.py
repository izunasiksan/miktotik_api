import asyncio
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.user import MasterUser
from app.core.security import get_password_hash

async def create_superuser():
    async with SessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(MasterUser).where(MasterUser.username == "admin"))
        user = result.scalars().first()
        
        if user:
            print("Superuser 'admin' already exists.")
            return

        print("Creating superuser 'admin'...")
        hashed_password = get_password_hash("admin")
        
        new_user = MasterUser(
            username="admin",
            password_hash=hashed_password,
            full_name="Administrator",
            role="admin",
            is_active=True
        )
        
        session.add(new_user)
        await session.commit()
        print("Superuser created successfully.")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_superuser())
