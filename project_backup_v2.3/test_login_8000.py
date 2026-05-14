
import httpx
import asyncio

async def test_login():
    url = "http://localhost:8000/api/v1/auth/login/"
    data = {
        "username": "developer",
        "password": "developer123"
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    print(f"Attempting login to {url} with user 'developer'...")
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            print("Client created, sending request...")
            response = await client.post(url, data=data, headers=headers)
            print("Response received.")
            
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
            print(f"Headers: {response.headers}")
        
        if response.status_code == 200:
            print("Login SUCCESS!")
        else:
            print("Login FAILED!")
            
    except Exception as e:
        print(f"Exception occurred: {repr(e)}")

if __name__ == "__main__":
    asyncio.run(test_login())
