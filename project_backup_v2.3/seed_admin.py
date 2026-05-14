import asyncio
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.user import MasterUser
from app.core.security import get_password_hash

async def create_developer_user():
    print("Mengecek user 'developer'...")
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(MasterUser).where(MasterUser.username == "developer"))
            user = result.scalars().first()
            
            if not user:
                print("User 'developer' tidak ditemukan. Membuat user baru...")
                new_user = MasterUser(
                    username="developer",
                    password_hash=get_password_hash("developer123"),
                    full_name="Developer Admin",
                    role="admin",
                    is_active=True
                )
                db.add(new_user)
                await db.commit()
                print("User 'developer' berhasil dibuat!")
                print("Username: developer")
                print("Password: developer123")
            else:
                print("User 'developer' sudah ada. Mengupdate password...")
                user.password_hash = get_password_hash("developer123")
                user.role = "admin"
                user.is_active = True
                await db.commit()
                print("Password user 'developer' berhasil direset ke 'developer123'.")
                
        except Exception as e:
            print(f"Terjadi error: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(create_developer_user())
