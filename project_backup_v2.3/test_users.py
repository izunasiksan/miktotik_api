import asyncio
import httpx
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_users():
    base_url = "http://localhost:8003/api/v1"
    
    # 1. Login as Superuser
    print("Testing Login (Superuser)...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{base_url}/auth/login",
                data={"username": "admin", "password": "admin"},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                print(f"Login failed: {response.status_code} - {response.text}")
                return
            
            token = response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            print("Login successful.")
            
            # 2. List Users
            print("Listing Users...")
            response = await client.get(f"{base_url}/users/", headers=headers)
            print(f"Users: {response.json()}")
            
            # 3. Create User
            print("Creating User...")
            new_user = {
                "username": "testuser",
                "password": "testpassword",
                "full_name": "Test User",
                "role": "teknisi"
            }
            response = await client.post(f"{base_url}/users/", json=new_user, headers=headers)
            if response.status_code == 200:
                created_user = response.json()
                print(f"User created: {created_user}")
                user_id = created_user["user_id"]
            else:
                print(f"Create user failed: {response.status_code} - {response.text}")
                # Try to find if user exists
                if "already exists" in response.text:
                    print("User already exists, skipping create.")
                    # Get the user to update/delete
                    users = (await client.get(f"{base_url}/users/", headers=headers)).json()
                    for u in users:
                        if u["username"] == "testuser":
                            user_id = u["user_id"]
                            break
                else:
                    return

            # 4. Update User
            print(f"Updating User {user_id}...")
            update_data = {"full_name": "Updated Test User"}
            response = await client.put(f"{base_url}/users/{user_id}", json=update_data, headers=headers)
            print(f"Update response: {response.json()}")
            
            # 5. Delete User
            print(f"Deleting User {user_id}...")
            response = await client.delete(f"{base_url}/users/{user_id}", headers=headers)
            print(f"Delete response: {response.status_code}")
            
        except httpx.ConnectError:
            print("Connection failed. Is the server running?")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_users())
