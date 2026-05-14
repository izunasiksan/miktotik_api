
import httpx
import asyncio

async def check_api():
    async with httpx.AsyncClient() as client:
        print("Checking API behavior for Trailing Slashes... V3")
        
        # 1. List Boards
        resp = await client.get("http://localhost:8000/api/v1/boards", follow_redirects=False)
        print(f"GET /boards      : {resp.status_code} {['-> ' + resp.headers['location'] if resp.status_code in [301, 307] else '']}")

        resp = await client.get("http://localhost:8000/api/v1/boards/", follow_redirects=False)
        print(f"GET /boards/     : {resp.status_code}")

        # 2. Get Board Detail (TESTING NEW ROUTE)
        # Using a fake UUID.
        
        # Test without slash
        resp = await client.get("http://localhost:8000/api/v1/boards/123e4567-e89b-12d3-a456-426614174000", follow_redirects=False)
        print(f"GET /boards/{{id}} : {resp.status_code}")

        # Test details/ (should work)
        resp = await client.get("http://localhost:8000/api/v1/boards/123e4567-e89b-12d3-a456-426614174000/details/", follow_redirects=False)
        print(f"GET /details/    : {resp.status_code}")

if __name__ == "__main__":
    asyncio.run(check_api())
