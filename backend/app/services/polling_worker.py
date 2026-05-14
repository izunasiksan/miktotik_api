import asyncio
import logging
import time
import re
import random
from typing import List, Dict, Any
from datetime import date
from sqlalchemy import select, and_, update, func
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
import routeros_api

logger = logging.getLogger("polling_worker")

# Global in-memory state for delta calculation
# Structure: { board_id_str: { 'interface': {name: data}, 'hotspot': {user: data}, 'pppoe': {user: data} } }
_prev_stats: Dict[str, Dict[str, Dict[str, Any]]] = {}

def parse_mikrotik_uptime(uptime_str: str) -> int:
    """
    Parses Mikrotik uptime string to seconds.
    Formats supported:
    - 10s
    - 10m
    - 1h10m
    - 1d05:30:15 (Print format)
    - 2w1d5h
    """
    if not uptime_str:
        return 0
    
    total_seconds = 0
    
    # Handle '1d05:30:15' format
    if ':' in uptime_str:
        parts = uptime_str.split('d')
        time_part = parts[-1]
        days = int(parts[0]) if len(parts) > 1 else 0
        
        try:
            t_parts = time_part.split(':')
            if len(t_parts) == 3:
                h, m, s = map(int, t_parts)
                total_seconds = (days * 86400) + (h * 3600) + (m * 60) + s
            elif len(t_parts) == 2: # mm:ss ? or hh:mm? usually hh:mm:ss
                 m, s = map(int, t_parts)
                 total_seconds = (days * 86400) + (m * 60) + s
        except ValueError:
            logger.warning(f"Failed to parse uptime with colon: {uptime_str}")
            return 0
    else:
        # Handle '1w2d3h4m5s' format
        # Note: Order is usually w, d, h, m, s.
        # Simple extraction using regex
        patterns = {
            'w': 604800,
            'd': 86400,
            'h': 3600,
            'm': 60,
            's': 1
        }
        
        current_num = ""
        for char in uptime_str:
            if char.isdigit():
                current_num += char
            elif char in patterns and current_num:
                total_seconds += int(current_num) * patterns[char]
                current_num = ""
        
    return total_seconds

async def run_polling_cycle(batch_size: int = 20, timeout_seconds: int = 20) -> None:
    async with SessionLocal() as session:
        # Select necessary columns to avoid full object load
        q = select(MikrotikBoard.board_id).where(
            and_(MikrotikBoard.is_monitor.is_(True), MikrotikBoard.is_maintenance.is_(False))
        )
        res = await session.execute(q)
        board_ids: List = list(res.scalars().all())

    for i in range(0, len(board_ids), batch_size):
        batch = board_ids[i : i + batch_size]
        sem = asyncio.Semaphore(batch_size)
        tasks = [
            asyncio.create_task(asyncio.wait_for(_poll_board(bid, sem), timeout=timeout_seconds))
            for bid in batch
        ]
        # return_exceptions=True prevents one crash from stopping others
        await asyncio.gather(*tasks, return_exceptions=True)


async def _poll_board(board_id, sem: asyncio.Semaphore) -> None:
    # Rule 1.1: Jitter (jeda acak kecil) antar request router
    # Add a small random jitter (0-5 seconds) before starting the poll for this board
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
        board_id_str = str(board.board_id)
        
        # Initialize metrics with default offline state
        metrics: Dict[str, Any] = {"is_online": False}

        if not cred or not cred.username_mikrotik:
            # logger.warning(f"Board {board.board_name} has no credentials.")
            return

        host = str(board.ip_address)
        port = int(board.port_api or 8728)
        username = cred.username_mikrotik
        password = decrypt_password(cred.password_mikrotik_encrypted)

        def fetch_sync():
            # Use short timeout for connection
            use_ssl = (port == 8729)
            # Create the pool object
            pool = routeros_api.RouterOsApiPool(
                host, username=username, password=password, port=port, plaintext_login=True, use_ssl=use_ssl
            )
            try:
                api = pool.get_api()
                try:
                    # Rule 1.2: Fetch specific columns (proplist) for efficiency
                    sys_res = api.get_resource("/system/resource").get(
                        proplist=["cpu-load", "free-memory", "free-hdd-space", "uptime"]
                    )
                    d = sys_res[0] if sys_res else {}
                    cpu_load = int(d.get("cpu-load", 0) or 0)
                    free_memory = int(d.get("free-memory", 0) or 0)
                    free_hdd = int(d.get("free-hdd-space", 0) or 0)
                    uptime = str(d.get("uptime", "0s"))
                    
                    # Active Users & Detail
                    # Hotspot
                    h_active = api.get_resource("/ip/hotspot/active").get(
                        proplist=[".id", "user", "bytes-in", "bytes-out", "uptime"]
                    )
                    hotspot_details = []
                    for h in h_active:
                        # bytes-in/out format usually "1234" string
                        hotspot_details.append({
                            "id": h.get(".id"),
                            "user": h.get("user"),
                            "bytes_in": int(h.get("bytes-in", 0)),
                            "bytes_out": int(h.get("bytes-out", 0)),
                            "uptime": h.get("uptime", "0s") 
                        })
                    
                    # PPPoE
                    p_active = api.get_resource("/ppp/active").get(
                        proplist=[".id", "name", "uptime"]
                    )
                    pppoe_details = []
                    
                    total_hotspot = len(h_active)
                    total_pppoe = len(p_active)
                    
                    # Interface Stats (covers physical AND pppoe dynamic interfaces)
                    interfaces = api.get_resource("/interface").get(
                        proplist=["name", "rx-byte", "tx-byte", "type", ".id"]
                    )
                    
                    processed_interfaces = []
                    processed_pppoe_stats = []
                    
                    for iface in interfaces:
                        name = iface.get("name")
                        rx_byte = int(iface.get("rx-byte", 0))
                        tx_byte = int(iface.get("tx-byte", 0))
                        iface_type = iface.get("type", "")
                        # Mikrotik internal ID for interface
                        iface_id = iface.get(".id")
                        
                        processed_interfaces.append({
                            "name": name,
                            "id": iface_id,
                            "rx_byte": rx_byte,
                            "tx_byte": tx_byte,
                            "type": iface_type
                        })
                        
                        # Identify PPPoE Interfaces
                        if iface_type == "pppoe-in":
                             processed_pppoe_stats.append({
                                 "user": name.replace("<pppoe-", "").replace(">", ""), 
                                 "id": iface_id, # Use interface ID for tracking
                                 "rx_byte": rx_byte, 
                                 "tx_byte": tx_byte,
                                 "uptime": "0s" # Placeholder, need to join with active
                             })

                    return {
                        "is_online": True,
                        "cpu_load": cpu_load,
                        "free_memory": free_memory,
                        "free_hdd": free_hdd,
                        "uptime": uptime,
                        "uptime_seconds": parse_mikrotik_uptime(uptime),
                        "total_hotspot": total_hotspot,
                        "total_pppoe": total_pppoe,
                        "interfaces": processed_interfaces,
                        "hotspot_details": hotspot_details,
                        "pppoe_details": processed_pppoe_stats # Using interface stats for pppoe bytes
                    }

                finally:
                    # Close API connection
                    # Note: pool.get_api() returns api object. 
                    # RouterOsApiPool doesn't have close() on pool itself easily, 
                    # but usually we disconnect the api or the pool.
                    # Looking at library: pool.disconnect() matches previous code intention?
                    # The original code used `with pool`.
                    # routeros_api source: RouterOsApiPool has disconnect().
                    pool.disconnect()
            except Exception as e:
                # logger.error(f"Failed to fetch data from {board.board_name}: {e}")
                return None

        loop = asyncio.get_running_loop()
        try:
            # Run blocking API call in executor
            data = await loop.run_in_executor(None, fetch_sync)
            if not data:
                metrics["is_online"] = False
                # Trigger alert manager with offline state and exit early for this board
                await alert_manager.check_health(session, board, metrics)
                return
            metrics.update(data)
            
            # --- 1. Save Resource & Client Stats ---
            session.add(
                BoardResourceStat(
                    board_id=board_id,
                    cpu_load=data["cpu_load"],
                    free_memory=data["free_memory"],
                    free_hdd=data["free_hdd"],
                    uptime=data["uptime"],
                )
            )
            session.add(
                BoardClientStat(
                    board_id=board_id,
                    total_hotspot=data["total_hotspot"],
                    total_pppoe=data["total_pppoe"],
                )
            )
            
            # --- 2. Calculate Delta & Save Interface/User Stats ---
            current_time = time.time()
            if board_id_str not in _prev_stats:
                _prev_stats[board_id_str] = {
                    "interface": {},
                    "hotspot": {},
                    "pppoe": {}
                }
            
            today = date.today()
            
            # Helper to calculate delta
            def get_delta(prev_dict, key, curr_rx, curr_tx):
                prev = prev_dict.get(key)
                d_rx, d_tx = 0, 0
                if prev:
                    # Check for reset/reboot
                    if curr_rx >= prev["rx"]:
                        d_rx = curr_rx - prev["rx"]
                    else:
                        d_rx = curr_rx
                    
                    if curr_tx >= prev["tx"]:
                        d_tx = curr_tx - prev["tx"]
                    else:
                        d_tx = curr_tx
                return d_rx, d_tx, prev
            
            # A. Interface & Speed Stats
            for iface in data.get("interfaces", []):
                name = iface["name"]
                iface_id = iface.get("id", name) # Use name as fallback if ID missing
                curr_rx = iface["rx_byte"]
                curr_tx = iface["tx_byte"]
                
                d_rx, d_tx, prev_data = get_delta(_prev_stats[board_id_str]["interface"], iface_id, curr_rx, curr_tx)
                
                # Speed Calculation
                download_mbps = 0.0
                upload_mbps = 0.0
                if prev_data:
                    time_diff = current_time - prev_data["time"]
                    if time_diff > 0:
                        download_mbps = (d_rx * 8) / time_diff / 1_000_000
                        upload_mbps = (d_tx * 8) / time_diff / 1_000_000

                # Update Memory using ID
                _prev_stats[board_id_str]["interface"][iface_id] = {"rx": curr_rx, "tx": curr_tx, "time": current_time}
                
                if d_rx > 0 or d_tx > 0 or prev_data is None:
                    # Save Speed (Snapshot)
                    if prev_data:
                        session.add(BoardSpeedStat(
                            board_id=board_id, interface_name=name,
                            download_mbps=round(download_mbps, 2), upload_mbps=round(upload_mbps, 2)
                        ))
                    
                    # Upsert Interface Usage
                    stmt = insert(BoardInterfaceUsage).values(
                        board_id=board_id, interface_name=name, log_date=today,
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

            # B. Hotspot Usage
            # Aggregate deltas by username first to handle multi-login
            hotspot_deltas = {} # {username: {'dl': 0, 'ul': 0, 'time': 0}}

            for h in data.get("hotspot_details", []):
                user = h["user"]
                sess_id = h.get("id", user) # Use ID for delta tracking
                
                curr_ul = h["bytes_in"] 
                curr_dl = h["bytes_out"]
                curr_uptime_str = h["uptime"]
                curr_uptime_sec = parse_mikrotik_uptime(curr_uptime_str)
                
                # Get Delta for THIS SESSION
                d_ul, d_dl, prev_data = get_delta(_prev_stats[board_id_str]["hotspot"], sess_id, curr_ul, curr_dl)
                
                # Calculate Uptime Delta
                d_time = 0
                if prev_data:
                     if curr_uptime_sec >= prev_data.get("uptime", 0):
                         d_time = curr_uptime_sec - prev_data.get("uptime", 0)
                     else:
                         d_time = curr_uptime_sec
                else:
                    d_time = 0
                
                # Update Memory for THIS SESSION
                _prev_stats[board_id_str]["hotspot"][sess_id] = {
                    "rx": curr_ul, 
                    "tx": curr_dl, 
                    "time": current_time,
                    "uptime": curr_uptime_sec
                }
                
                # Aggregate to Username
                if user not in hotspot_deltas:
                    hotspot_deltas[user] = {'dl': 0, 'ul': 0, 'time': 0}
                
                hotspot_deltas[user]['dl'] += d_dl
                hotspot_deltas[user]['ul'] += d_ul
                hotspot_deltas[user]['time'] += d_time

            # Batch Insert for Hotspot
            for user, deltas in hotspot_deltas.items():
                if deltas['dl'] > 0 or deltas['ul'] > 0 or deltas['time'] > 0:
                    stmt = insert(HotspotUsageRaw).values(
                        board_id=board_id, username=user, log_date=today,
                        daily_download=deltas['dl'], daily_upload=deltas['ul'], daily_uptime=deltas['time']
                    ).on_conflict_do_update(
                        constraint='unique_user_daily_raw',
                        set_={
                            "daily_download": HotspotUsageRaw.daily_download + deltas['dl'],
                            "daily_upload": HotspotUsageRaw.daily_upload + deltas['ul'],
                            "daily_uptime": HotspotUsageRaw.daily_uptime + deltas['time']
                        }
                    )
                    await session.execute(stmt)

            # C. PPPoE Usage
            # Aggregate deltas by username (rarely multi-login but good practice)
            pppoe_deltas = {}

            for p in data.get("pppoe_details", []):
                user = p["user"] 
                sess_id = p.get("id", user)
                
                curr_ul = p["rx_byte"]
                curr_dl = p["tx_byte"]
                
                d_ul, d_dl, _ = get_delta(_prev_stats[board_id_str]["pppoe"], sess_id, curr_ul, curr_dl)
                
                _prev_stats[board_id_str]["pppoe"][sess_id] = {"rx": curr_ul, "tx": curr_dl, "time": current_time}
                
                if user not in pppoe_deltas:
                    pppoe_deltas[user] = {'dl': 0, 'ul': 0}
                
                pppoe_deltas[user]['dl'] += d_dl
                pppoe_deltas[user]['ul'] += d_ul

            for user, deltas in pppoe_deltas.items():
                if deltas['dl'] > 0 or deltas['ul'] > 0:
                    stmt = insert(BoardPppoeUsage).values(
                        board_id=board_id, pppoe_username=user, log_date=today,
                        download_bytes=deltas['dl'], upload_bytes=deltas['ul']
                    ).on_conflict_do_update(
                        constraint='unique_pppoe_daily',
                        set_={
                            "download_bytes": BoardPppoeUsage.download_bytes + deltas['dl'],
                            "upload_bytes": BoardPppoeUsage.upload_bytes + deltas['ul'],
                            "last_update": func.now()
                        }
                    )
                    await session.execute(stmt)

            await session.commit()
            
        except Exception as e:
            logger.error(f"Polling failed for {board.board_name} ({host}): {e}")
            metrics["is_online"] = False
            # Rollback in case of partial insert errors
            await session.rollback()
        
        # Trigger Alert Logic
        try:
            await alert_manager.check_health(session, board, metrics)
        except Exception as e:
             logger.error(f"Alert manager failed for {board.board_name}: {e}")
