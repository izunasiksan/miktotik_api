import asyncssh
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("polling_async_ssh")

async def poll_board_ssh(
    host: str, 
    username: str, 
    password: str, 
    port: int = 22, 
    timeout: int = 10
) -> Dict[str, Any]:
    """
    Prototype: Polling Mikrotik via AsyncSSH (Non-blocking).
    Replaces blocking routeros_api call.
    """
    metrics = {
        "is_online": False,
        "cpu_load": 0,
        "free_memory": 0,
        "free_hdd": 0,
        "uptime": "0s",
        "total_hotspot": 0,
        "total_pppoe": 0
    }

    try:
        async with asyncssh.connect(
            host, 
            port=port, 
            username=username, 
            password=password, 
            known_hosts=None, # In production, manage known_hosts!
            client_keys=None,
            connect_timeout=timeout
        ) as conn:
            
            # 1. Get System Resource
            # Using :put to get values. We can try to get structured data if possible,
            # but CLI usually returns human readable.
            # Trick: Use scripting to print specific values to make parsing easier.
            cmd_resource = ":put [ /system resource get cpu-load ]; :put [ /system resource get free-memory ]; :put [ /system resource get free-hdd-space ]; :put [ /system resource get uptime ];"
            
            # 2. Get Counts
            cmd_counts = ":put [ /ip hotspot active print count-only ]; :put [ /ppp active print count-only ];"
            
            # Run commands
            # We can run them in one go or separate. One go is faster (less roundtrip).
            full_cmd = f"{cmd_resource} {cmd_counts}"
            
            result = await conn.run(full_cmd, check=True)
            stdout_text = (result.stdout or "").strip()
            if isinstance(stdout_text, (bytes, bytearray)):
                try:
                    stdout_text = stdout_text.decode("utf-8", errors="ignore")
                except Exception:
                    stdout_text = ""
            output = str(stdout_text).splitlines()
            
            # Clean empty lines
            output = [line for line in output if line.strip() != ""]
            
            # Expected output order:
            # 1. cpu-load
            # 2. free-memory
            # 3. free-hdd-space
            # 4. uptime
            # 5. hotspot count
            # 6. pppoe count
            
            if len(output) >= 6:
                metrics["cpu_load"] = int(output[0])
                metrics["free_memory"] = int(output[1])
                metrics["free_hdd"] = int(output[2])
                metrics["uptime"] = output[3]
                metrics["total_hotspot"] = int(output[4])
                metrics["total_pppoe"] = int(output[5])
                metrics["is_online"] = True
            else:
                logger.warning(f"Unexpected SSH output format from {host}: {output}")

    except (OSError, asyncssh.Error) as e:
        logger.error(f"SSH polling failed for {host}: {e}")
        metrics["is_online"] = False
    
    return metrics

# Example usage (for testing)
async def main():
    # Replace with real credentials for testing
    res = await poll_board_ssh("192.168.88.1", "admin", "password")
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
