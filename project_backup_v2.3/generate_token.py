
import asyncio
from app.core.database import SessionLocal
from app.models.user import MasterUser
from sqlalchemy import select
from app.core.security import create_access_token
from datetime import timedelta

async def generate_token():
    async with SessionLocal() as db:
        result = await db.execute(select(MasterUser).where(MasterUser.username == "developer"))
        user = result.scalars().first()
        if user:
            token = create_access_token(user.username, expires_delta=timedelta(minutes=30))
            with open("token.txt", "w") as f:
                f.write(token)
            print("Token written to token.txt")
        else:
            print("User developer not found")

if __name__ == "__main__":
    asyncio.run(generate_token())
