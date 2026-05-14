import asyncio

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import MasterUser, MasterRole


async def create_or_update_user(
    username: str, password: str, full_name: str = "", role_name: str = "admin"
):
    print(f"Mengecek user '{username}'...")
    async with SessionLocal() as db:
        try:
            # Get role_id from role_name
            role_result = await db.execute(select(MasterRole).where(MasterRole.role_name == role_name))
            role = role_result.scalars().first()
            if not role:
                print(f"Role '{role_name}' tidak ditemukan. Membuat role baru...")
                role = MasterRole(role_name=role_name)
                db.add(role)
                await db.flush()
            
            role_id = role.role_id

            result = await db.execute(
                select(MasterUser).where(MasterUser.username == username)
            )
            user = result.scalars().first()

            if not user:
                print(f"User '{username}' tidak ditemukan. Membuat user baru...")
                new_user = MasterUser(
                    username=username,
                    password_hash=get_password_hash(password),
                    full_name=full_name or username,
                    role_id=role_id,
                    is_active=True,
                )
                db.add(new_user)
                await db.commit()
                print(f"User '{username}' berhasil dibuat sebagai {role_name}.")
            else:
                print(f"User '{username}' sudah ada. Mengupdate password/role...")
                user.password_hash = get_password_hash(password)
                user.role_id = role_id
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
