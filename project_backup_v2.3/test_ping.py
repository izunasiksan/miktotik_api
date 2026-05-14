import httpx
import asyncio

async def test_ping():
    # Test Root
    url_root = "http://127.0.0.1:8000/"
    print(f"Attempting ping to {url_root}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url_root)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {repr(e)}")

    # Test Docs
    url_docs = "http://127.0.0.1:8000/docs"
    print(f"Attempting ping to {url_docs}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url_docs)
            print(f"Status Code: {response.status_code}")
            # print(f"Response: {response.text[:100]}...") # Truncate for brevity
    except Exception as e:
        print(f"Error: {repr(e)}")

    # Test Login
    url_login = "http://127.0.0.1:8000/api/v1/auth/login/" # Assuming this is the correct path, verify with auth.py
    print(f"Attempting login to {url_login}...")
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "username": "developer",
                "password": "developer123"
            }
            # OAuth2PasswordRequestForm expects form data, not JSON
            response = await client.post(url_login, data=payload)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {repr(e)}")

if __name__ == "__main__":
    asyncio.run(test_ping())
