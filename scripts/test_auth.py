import asyncio
import httpx
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_auth():
    base_url = "http://localhost:8001/api/v1"
    
    # 1. Test Login
    print("Testing Login...")
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
            
            data = response.json()
            token = data.get("access_token")
            print(f"Login successful. Token: {token[:20]}...")
            
            # 2. Test Protected Route
            print("Testing Protected Route...")
            response = await client.post(
                f"{base_url}/auth/test-token",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"Protected route success. User: {user_data}")
            else:
                print(f"Protected route failed: {response.status_code} - {response.text}")
                
        except httpx.ConnectError:
            print("Connection failed. Is the server running?")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_auth())
