
import sys
import os
import asyncio
from fastapi.routing import APIRoute

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

def list_routes():
    print("Listing all registered routes:")
    print(f"{'Method':<10} | {'Path':<50} | {'Name':<20}")
    print("-" * 85)
    
    for route in app.routes:
        if isinstance(route, APIRoute):
            methods = ", ".join(route.methods)
            print(f"{methods:<10} | {route.path:<50} | {route.name:<20}")

if __name__ == "__main__":
    list_routes()
