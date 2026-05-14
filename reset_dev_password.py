import asyncio
from app.core.database import SessionLocal
from app.models.user import MasterUser
from app.models.mikrotik import MikrotikBoard # Required for relationship resolution
from sqlalchemy import select
from app.core.security import get_password_hash

async def reset_password():
    username = "developer"
    password = "developer123"
    print(f"Resetting password for {username}...")
    
    async with SessionLocal() as session:
        result = await session.execute(select(MasterUser).where(MasterUser.username == username))
        user = result.scalars().first()
        if user:
            user.password_hash = get_password_hash(password)
            user.is_active = True
            await session.commit()
            print("✅ Password reset successfully.")
        else:
            print("❌ User not found.")

if __name__ == "__main__":
    asyncio.run(reset_password())
