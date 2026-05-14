import asyncio
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.user import MasterUser
from app.core.security import get_password_hash

async def create_or_update_user(username: str, password: str, full_name: str = "", role: str = "admin"):
    print(f"Mengecek user '{username}'...")
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(MasterUser).where(MasterUser.username == username))
            user = result.scalars().first()
            
            if not user:
                print(f"User '{username}' tidak ditemukan. Membuat user baru...")
                new_user = MasterUser(
                    username=username,
                    password_hash=get_password_hash(password),
                    full_name=full_name or username,
                    role=role,
                    is_active=True
                )
                db.add(new_user)
                await db.commit()
                print(f"User '{username}' berhasil dibuat sebagai {role}.")
            else:
                print(f"User '{username}' sudah ada. Mengupdate password/role...")
                user.password_hash = get_password_hash(password)
                user.role = role
                user.is_active = True
                if full_name:
                    user.full_name = full_name
                await db.commit()
                print(f"User '{username}' berhasil diupdate.")
        except Exception as e:
            print(f"Terjadi error: {e}")
            await db.rollback()

async def main():
    await create_or_update_user("developer", "developer123", "Developer Admin", "admin")
    await create_or_update_user("iksan", "12345678", "Admin Iksan", "admin")

if __name__ == "__main__":
    asyncio.run(main())
