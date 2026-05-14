import asyncio
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.user import MasterUser
from app.models.mikrotik import MikrotikBoard # Import to ensure registry population
from app.core.security import get_password_hash
from app.core.config import Settings

async def create_user():
    settings = Settings()
    # Ensure DB connection string is correct for async
    db_url = settings.DATABASE_URL
    
    engine = create_async_engine(db_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            # Check if user exists
            result = await session.execute(select(MasterUser).where(MasterUser.username == "stress_test"))
            user = result.scalars().first()

            if not user:
                print("Creating 'stress_test' user...")
                new_user = MasterUser(
                    username="stress_test",
                    password_hash=get_password_hash("password"),
                    role="admin",
                    full_name="Stress Test User",
                    is_active=True
                )
                session.add(new_user)
                print("User 'stress_test' created successfully.")
            else:
                print("User 'stress_test' already exists.")

    await engine.dispose()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_user())
