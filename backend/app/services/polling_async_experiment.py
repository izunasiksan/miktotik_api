import asyncssh
import asyncio
import logging
import time
import random
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from sqlalchemy import select, and_, func
from sqlalchemy.dialects.postgresql import insert
from app.core.database import SessionLocal
from app.models.mikrotik import (
    MikrotikBoard,
    BoardCredential,
    BoardClientStat,
    BoardResourceStat,
    BoardSpeedStat,
    BoardInterfaceUsage,
    BoardPppoeUsage,
    HotspotUsageRaw
)
from app.services.alert_manager import alert_manager
from app.core.encryption import decrypt_password

logger = logging.getLogger("polling_async_ssh")

# Global in-memory state for delta calculation (similar to polling_worker.py)
_prev_stats: Dict[str, Dict[str, Dict[str, Any]]] = {}

def parse_mikrotik_uptime(uptime_str: str) -> int:
    """Parses Mikrotik uptime string to seconds."""
    if not uptime_str:
        return 0
    total_seconds = 0
    if ':' in uptime_str:
        parts = uptime_str.split('d')
        time_part = parts[-1]
        days = int(parts[0]) if len(parts) > 1 else 0
        try:
            t_parts = time_part.split(':')
            if len(t_parts) == 3:
                h, m, s = map(int, t_parts)
                total_seconds = (days * 86400) + (h * 3600) + (m * 60) + s
            elif len(t_parts) == 2:
                 m, s = map(int, t_parts)
                 total_seconds = (days * 86400) + (m * 60) + s
        except ValueError:
            return 0
    else:
        patterns = {'w': 604800, 'd': 86400, 'h': 3600, 'm': 60, 's': 1}
        current_num = ""
        for char in uptime_str:
            if char.isdigit():
                current_num += char
            elif char in patterns and current_num:
                total_seconds += int(current_num) * patterns[char]
                current_num = ""
    return total_seconds

async def poll_board_ssh(
    host: str, 
    username: str, 
    password: str, 
    port: int = 22, 
    timeout: int = 15
) -> Optional[Dict[str, Any]]:
    """
    Polling Mikrotik via AsyncSSH.
    Fetches resources, counts, and interface stats.
    """
    metrics = {
        "is_online": False,
        "cpu_load": 0,
        "free_memory": 0,
        "free_hdd": 0,
        "uptime": "0s",
        "total_hotspot": 0,
        "total_pppoe": 0,
        "interfaces": []
    }

    try:
        async with asyncssh.connect(
            host, 
            port=port, 
            username=username, 
            password=password, 
            known_hosts=None,
            client_keys=None,
            connect_timeout=timeout
        ) as conn:
            
            # Optimized commands for parsing
            cmd_resource = ":put [/system resource get cpu-load]; :put [/system resource get free-memory]; :put [/system resource get free-hdd-space]; :put [/system resource get uptime];"
            cmd_counts = ":put [/ip hotspot active print count-only]; :put [/ppp active print count-only];"
            cmd_interfaces = ":foreach i in=[/interface find] do={ :local n [/interface get $i name]; :local r [/interface get $i rx-byte]; :local t [/interface get $i tx-byte]; :local ty [/interface get $i type]; :put ($n . \",\" . $r . \",\" . $t . \",\" . $ty) };"
            
            full_cmd = f"{cmd_resource} {cmd_counts} {cmd_interfaces}"
            result = await conn.run(full_cmd, check=True)
            
            stdout_text = (result.stdout or "").strip()
            if isinstance(stdout_text, (bytes, bytearray)):
                stdout_text = stdout_text.decode("utf-8", errors="ignore")
            
            lines = [line.strip() for line in stdout_text.splitlines() if line.strip()]
            
            if len(lines) < 6:
                logger.warning(f"Insufficient data from {host}: {lines}")
                return None

            metrics["cpu_load"] = int(lines[0])
            metrics["free_memory"] = int(lines[1])
            metrics["free_hdd"] = int(lines[2])
            metrics["uptime"] = lines[3]
            metrics["uptime_seconds"] = parse_mikrotik_uptime(lines[3])
            metrics["total_hotspot"] = int(lines[4])
            metrics["total_pppoe"] = int(lines[5])
            metrics["is_online"] = True

            # Parse interfaces (from line 6 onwards)
            for i_line in lines[6:]:
                parts = i_line.split(',')
                if len(parts) >= 4:
                    metrics["interfaces"].append({
                        "name": parts[0],
                        "rx_byte": int(parts[1]),
                        "tx_byte": int(parts[2]),
                        "type": parts[3]
                    })
            
            return metrics

    except Exception as e:
        logger.error(f"SSH polling error for {host}: {e}")
        return None

async def _poll_board_task(board_id: Any, sem: asyncio.Semaphore):
    """Worker task for a single board."""
    # Jitter
    await asyncio.sleep(random.uniform(0, 5))
    
    async with sem, SessionLocal() as session:
        # Fetch Board and Credentials
        q = (
            select(MikrotikBoard, BoardCredential)
            .join(BoardCredential, BoardCredential.board_id == MikrotikBoard.board_id, isouter=True)
            .where(MikrotikBoard.board_id == board_id)
        )
        res = await session.execute(q)
        row = res.first()
        if not row:
            return
            
        board, cred = row
        if not cred or not cred.username_mikrotik:
            return

        host = str(board.ip_address)
        port = int(board.port_ssh or 22) # Default to SSH port 22
        username = cred.username_mikrotik
        password = decrypt_password(cred.password_mikrotik_encrypted)

        data = await poll_board_ssh(host, username, password, port)
        
        metrics = {"is_online": False}
        if not data:
            await alert_manager.check_health(session, board, metrics)
            return

        metrics.update(data)
        board_id_str = str(board.board_id)
        current_time = time.time()
        today = date.today()

        # 1. Save Resource & Client Stats
        session.add(BoardResourceStat(
            board_id=board.board_id,
            cpu_load=data["cpu_load"],
            free_memory=data["free_memory"],
            free_hdd=data["free_hdd"],
            uptime=data["uptime"]
        ))
        session.add(BoardClientStat(
            board_id=board.board_id,
            total_hotspot=data["total_hotspot"],
            total_pppoe=data["total_pppoe"]
        ))

        # 2. Delta & Speed Calculation
        if board_id_str not in _prev_stats:
            _prev_stats[board_id_str] = {"interface": {}}

        for iface in data["interfaces"]:
            name = iface["name"]
            curr_rx = iface["rx_byte"]
            curr_tx = iface["tx_byte"]
            
            prev = _prev_stats[board_id_str]["interface"].get(name)
            d_rx, d_tx = 0, 0
            download_mbps, upload_mbps = 0.0, 0.0

            if prev:
                # Delta with reboot protection
                d_rx = curr_rx - prev["rx"] if curr_rx >= prev["rx"] else curr_rx
                d_tx = curr_tx - prev["tx"] if curr_tx >= prev["tx"] else curr_tx
                
                time_diff = current_time - prev["time"]
                if time_diff > 0:
                    download_mbps = (d_rx * 8) / time_diff / 1_000_000
                    upload_mbps = (d_tx * 8) / time_diff / 1_000_000

            # Update memory
            _prev_stats[board_id_str]["interface"][name] = {"rx": curr_rx, "tx": curr_tx, "time": current_time}

            # Save Speed and Usage
            if d_rx > 0 or d_tx > 0 or prev is None:
                if prev:
                    session.add(BoardSpeedStat(
                        board_id=board.board_id, interface_name=name,
                        download_mbps=round(download_mbps, 2), upload_mbps=round(upload_mbps, 2)
                    ))
                
                stmt = insert(BoardInterfaceUsage).values(
                    board_id=board.board_id, interface_name=name, log_date=today,
                    total_rx_bytes=d_rx, total_tx_bytes=d_tx
                ).on_conflict_do_update(
                    constraint='unique_daily_usage',
                    set_={
                        "total_rx_bytes": BoardInterfaceUsage.total_rx_bytes + d_rx,
                        "total_tx_bytes": BoardInterfaceUsage.total_tx_bytes + d_tx,
                        "last_update": func.now()
                    }
                )
                await session.execute(stmt)

        await session.commit()
        await alert_manager.check_health(session, board, metrics)

async def run_async_polling_cycle(batch_size: int = 20):
    """Main entry point for the async polling cycle."""
    async with SessionLocal() as session:
        q = select(MikrotikBoard.board_id).where(
            and_(MikrotikBoard.is_monitor.is_(True), MikrotikBoard.is_maintenance.is_(False))
        )
        res = await session.execute(q)
        board_ids = list(res.scalars().all())

    sem = asyncio.Semaphore(batch_size)
    tasks = [_poll_board_task(bid, sem) for bid in board_ids]
    await asyncio.gather(*tasks, return_exceptions=True)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_async_polling_cycle())
