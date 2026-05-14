
import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from sqlalchemy import select
from app.models.user import MasterUser
from app.models.mikrotik import MikrotikBoard # Import to register the model
from app.core.security import get_password_hash

async def create_developer_account():
    print("🚀 Starting developer account creation...")
    
    username = "developer"
    password = "developer123" # Password default yang aman untuk dev
    full_name = "System Developer"
    role = "admin" # Role tertinggi
    
    try:
        async with SessionLocal() as session:
            # 1. Check existing user
            result = await session.execute(select(MasterUser).where(MasterUser.username == username))
            existing_user = result.scalars().first()
            
            if existing_user:
                print(f"⚠️ User '{username}' already exists.")
                
                # Update password and role if needed
                if not existing_user.is_active or existing_user.role != role:
                    print(f"🔄 Updating existing user '{username}' to ensure admin access...")
                    existing_user.password_hash = get_password_hash(password)
                    existing_user.role = role
                    existing_user.is_active = True
                    await session.commit()
                    print(f"✅ User '{username}' updated successfully.")
                else:
                    print(f"✅ User '{username}' is already active and set as admin.")
                    
            else:
                # 2. Create new user
                print(f"➕ Creating new user '{username}'...")
                new_user = MasterUser(
                    username=username,
                    password_hash=get_password_hash(password),
                    full_name=full_name,
                    role=role,
                    is_active=True # Langsung aktif tanpa approval
                )
                session.add(new_user)
                await session.commit()
                await session.refresh(new_user)
                print(f"✅ Developer account created successfully!")
                print(f"🆔 User ID: {new_user.user_id}")
            
            print("\n🔐 CREDENTIALS:")
            print(f"   Username: {username}")
            print(f"   Password: {password}")
            print(f"   Role    : {role}")
            
    except Exception as e:
        print(f"❌ Error creating account: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(create_developer_account())
