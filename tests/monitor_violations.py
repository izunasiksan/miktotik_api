import asyncio
import sys
import os
import time
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
import redis.asyncio as redis

async def monitor_violations(interval=2.0):
    """
    Monitor Redis keys for rate limit violations and blacklists in real-time.
    """
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    print(f"Starting Violation Monitor (Interval: {interval}s)")
    print(f"Redis URL: {settings.REDIS_URL}")
    print("-" * 60)
    
    try:
        while True:
            # 1. Get all violation keys
            violation_keys = await redis_client.keys("violations:*")
            blacklist_keys = await redis_client.keys("blacklist:*")
            
            # Clear screen (ANSI escape code)
            print("\033[H\033[J", end="")
            
            print(f"=== SECURITY MONITOR - {datetime.now().strftime('%H:%M:%S')} ===")
            print(f"Total Active Violations: {len(violation_keys)}")
            print(f"Total Blacklisted IPs: {len(blacklist_keys)}")
            print("-" * 60)
            
            if blacklist_keys:
                print("\n[BLACKLISTED IPs]")
                for key in blacklist_keys:
                    ttl = await redis_client.ttl(key)
                    ip = key.split(":")[1]
                    print(f"  ❌ {ip:<15} (Expires in {ttl}s)")
            else:
                print("\n[BLACKLISTED IPs] - None")

            if violation_keys:
                print("\n[ACTIVE VIOLATIONS]")
                print(f"  {'IP Address':<15} | {'Count':<5} | {'TTL':<5}")
                print(f"  {'-'*15} | {'-'*5} | {'-'*5}")
                
                for key in violation_keys:
                    count = await redis_client.get(key)
                    ttl = await redis_client.ttl(key)
                    ip = key.split(":")[1]
                    print(f"  {ip:<15} | {count:<5} | {ttl:<5}")
            else:
                print("\n[ACTIVE VIOLATIONS] - None")
                
            print("\nPress Ctrl+C to stop...")
            await asyncio.sleep(interval)
            
    except KeyboardInterrupt:
        print("\nStopping monitor...")
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        await redis_client.aclose()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(monitor_violations())
    except KeyboardInterrupt:
        pass
