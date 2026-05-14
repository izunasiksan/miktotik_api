import asyncio
import logging
import random
import time
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import routeros_api
from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert

from app.core.database import SessionLocal
from app.core.encryption import decrypt_password
from sqlalchemy.orm import joinedload
from app.models.mikrotik import (
    BoardClientStat,
    BoardCredential,
    BoardInterfaceUsage,
    BoardPppoeUsage,
    BoardResourceStat,
    BoardSpeedStat,
    HotspotUsageRaw,
    MikrotikBoard,
)
from app.services.alert_manager import alert_manager

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
    if ":" in uptime_str:
        parts = uptime_str.split("d")
        time_part = parts[-1]
        days = int(parts[0]) if len(parts) > 1 else 0

        try:
            t_parts = time_part.split(":")
            if len(t_parts) == 3:
                h, m, s = map(int, t_parts)
                total_seconds = (days * 86400) + (h * 3600) + (m * 60) + s
            elif len(t_parts) == 2:  # mm:ss ? or hh:mm? usually hh:mm:ss
                m, s = map(int, t_parts)
                total_seconds = (days * 86400) + (m * 60) + s
        except ValueError:
            logger.warning(f"Failed to parse uptime with colon: {uptime_str}")
            return 0
    else:
        # Handle '1w2d3h4m5s' format
        # Note: Order is usually w, d, h, m, s.
        # Simple extraction using regex
        patterns = {"w": 604800, "d": 86400, "h": 3600, "m": 60, "s": 1}

        current_num = ""
        for char in uptime_str:
            if char.isdigit():
                current_num += char
            elif char in patterns and current_num:
                total_seconds += int(current_num) * patterns[char]
                current_num = ""

    return total_seconds


async def run_polling_cycle(batch_size: int = 20, timeout_seconds: int = 20) -> None:
    # UPDATE 2.4.1 Jitter: Tambahkan jitter antar batch untuk mengurangi spike CPU
    await asyncio.sleep(random.uniform(1, 10))

    async with SessionLocal() as session:
        # Rule 1.2: Fetch specific columns (proplist) for efficiency
        # UPDATE 2.4.1 Partitioning Filter: Gunakan filter waktu pada query monitoring historis
        q = select(MikrotikBoard.board_id).where(
            and_(
                MikrotikBoard.is_monitor.is_(True),
                MikrotikBoard.is_maintenance.is_(False),
            )
        )
        res = await session.execute(q)
        board_ids: List = list(res.scalars().all())

    for i in range(0, len(board_ids), batch_size):
        batch = board_ids[i : i + batch_size]
        sem = asyncio.Semaphore(batch_size)

        # UPDATE 2.4.1 Jitter: Tambahkan jitter antar task dalam satu batch
        tasks = [
            asyncio.create_task(
                asyncio.wait_for(_poll_board(bid, sem), timeout=timeout_seconds)
            )
            for bid in batch
        ]
        # return_exceptions=True mencegah satu kegagalan menghentikan yang lain
        await asyncio.gather(*tasks, return_exceptions=True)

        # UPDATE 2.4.1 Jitter: Jeda antar batch
        await asyncio.sleep(random.uniform(2, 5))


def _get_api_data(
    host: str, username: str, password: str, port: int
) -> Optional[Dict[str, Any]]:
    """Helper to fetch data from Mikrotik API in a sync manner (for executor)."""
    # UPDATE 2.4.1 Refactor: Extract sync fetching to reduce complexity
    use_ssl = port == 8729
    pool = routeros_api.RouterOsApiPool(
        host,
        username=username,
        password=password,
        port=port,
        plaintext_login=True,
        use_ssl=use_ssl,
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
            h_active = api.get_resource("/ip/hotspot/active").get(
                proplist=[".id", "user", "bytes-in", "bytes-out", "uptime"]
            )
            hotspot_details = []
            for h in h_active:
                hotspot_details.append(
                    {
                        "id": h.get(".id"),
                        "user": h.get("user"),
                        "bytes_in": int(h.get("bytes-in", 0)),
                        "bytes_out": int(h.get("bytes-out", 0)),
                        "uptime": h.get("uptime", "0s"),
                    }
                )

            p_active = api.get_resource("/ppp/active").get(
                proplist=[".id", "name", "uptime"]
            )

            total_hotspot = len(h_active)
            total_pppoe = len(p_active)

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
                iface_id = iface.get(".id")

                processed_interfaces.append(
                    {
                        "name": name,
                        "id": iface_id,
                        "rx_byte": rx_byte,
                        "tx_byte": tx_byte,
                        "type": iface_type,
                    }
                )

                if iface_type == "pppoe-in":
                    processed_pppoe_stats.append(
                        {
                            "user": name.replace("<pppoe-", "").replace(">", ""),
                            "id": iface_id,
                            "rx_byte": rx_byte,
                            "tx_byte": tx_byte,
                            "uptime": "0s",
                        }
                    )

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
                "pppoe_details": processed_pppoe_stats,
            }
        finally:
            pool.disconnect()
    except Exception:
        return None


async def _save_polling_results(
    session, board_id, data, current_time, today, board_id_str
):
    """Helper to save polling metrics and deltas to database."""
    # UPDATE 2.4.1 Refactor: Extract database saving to reduce complexity
    # Rule 3.1: Data yang ditampilkan harus kondisi terkini (Accuracy Metadata)
    accuracy_val = 100.00  # Default 100% jika polling sukses

    # UPDATE 2.4.1 Partitioning Filter: Pastikan log_time/log_date disertakan untuk partisi
    log_time_now = func.now()

    # 1. Save Resource & Client Stats
    session.add(
        BoardResourceStat(
            board_id=board_id,
            cpu_load=data["cpu_load"],
            free_memory=data["free_memory"],
            free_hdd=data["free_hdd"],
            uptime=data["uptime"],
            accuracy_pct=accuracy_val,  # UPDATE 2.4.1: Add accuracy_pct
            log_time=log_time_now,  # UPDATE 2.4.1: Explicit log_time
        )
    )
    session.add(
        BoardClientStat(
            board_id=board_id,
            total_hotspot=data["total_hotspot"],
            total_pppoe=data["total_pppoe"],
            accuracy_pct=accuracy_val,  # UPDATE 2.4.1: Add accuracy_pct
            log_time=log_time_now,  # UPDATE 2.4.1: Explicit log_time
        )
    )

    # 2. Calculate Delta & Save Interface/User Stats
    if board_id_str not in _prev_stats:
        _prev_stats[board_id_str] = {
            "interface": {},
            "hotspot": {},
            "pppoe": {},
        }

    # Helper to calculate delta
    def get_delta(prev_dict, key, curr_rx, curr_tx):
        prev = prev_dict.get(key)
        d_rx, d_tx = 0, 0
        if prev:
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
        iface_id = iface.get("id", name)
        curr_rx = iface["rx_byte"]
        curr_tx = iface["tx_byte"]

        d_rx, d_tx, prev_data = get_delta(
            _prev_stats[board_id_str]["interface"], iface_id, curr_rx, curr_tx
        )

        download_mbps = 0.0
        upload_mbps = 0.0
        if prev_data:
            time_diff = current_time - prev_data["time"]
            if time_diff > 0:
                download_mbps = (d_rx * 8) / time_diff / 1_000_000
                upload_mbps = (d_tx * 8) / time_diff / 1_000_000

        _prev_stats[board_id_str]["interface"][iface_id] = {
            "rx": curr_rx,
            "tx": curr_tx,
            "time": current_time,
        }

        # UPDATE 2.4.1: Skip saving if no activity and not first run to reduce DB noise
        if d_rx > 0 or d_tx > 0 or prev_data is None:
            if prev_data:
                session.add(
                    BoardSpeedStat(
                        board_id=board_id,
                        interface_name=name,
                        download_mbps=round(download_mbps, 2),
                        upload_mbps=round(upload_mbps, 2),
                        accuracy_pct=accuracy_val,
                        log_time=log_time_now,
                    )
                )

            # UPDATE 2.4.1 Partitioning: On conflict filter by log_date
            stmt = (
                insert(BoardInterfaceUsage)
                .values(
                    board_id=board_id,
                    interface_name=name,
                    log_date=today,
                    total_rx_bytes=d_rx,
                    total_tx_bytes=d_tx,
                    accuracy_pct=accuracy_val,
                )
                .on_conflict_do_update(
                    constraint="unique_daily_usage",
                    set_={
                        "total_rx_bytes": BoardInterfaceUsage.total_rx_bytes + d_rx,
                        "total_tx_bytes": BoardInterfaceUsage.total_tx_bytes + d_tx,
                        "accuracy_pct": accuracy_val,
                        "last_update": func.now(),
                    },
                )
            )
            await session.execute(stmt)

    # B. Hotspot Usage
    hotspot_deltas = {}
    for h in data.get("hotspot_details", []):
        user = h["user"]
        sess_id = h.get("id", user)
        curr_ul = h["bytes_in"]
        curr_dl = h["bytes_out"]
        curr_uptime_sec = parse_mikrotik_uptime(h["uptime"])

        d_ul, d_dl, prev_data = get_delta(
            _prev_stats[board_id_str]["hotspot"], sess_id, curr_ul, curr_dl
        )

        d_time = 0
        if prev_data:
            if curr_uptime_sec >= prev_data.get("uptime", 0):
                d_time = curr_uptime_sec - prev_data.get("uptime", 0)
            else:
                d_time = curr_uptime_sec

        _prev_stats[board_id_str]["hotspot"][sess_id] = {
            "rx": curr_ul,
            "tx": curr_dl,
            "time": current_time,
            "uptime": curr_uptime_sec,
        }

        if user not in hotspot_deltas:
            hotspot_deltas[user] = {"dl": 0, "ul": 0, "time": 0}
        hotspot_deltas[user]["dl"] += d_dl
        hotspot_deltas[user]["ul"] += d_ul
        hotspot_deltas[user]["time"] += d_time

    for user, deltas in hotspot_deltas.items():
        # UPDATE 2.4.1: Skip saving if no activity and not first run to reduce DB noise
        if deltas["dl"] > 0 or deltas["ul"] > 0 or deltas["time"] > 0:
            stmt = (
                insert(HotspotUsageRaw)
                .values(
                    board_id=board_id,
                    username=user,
                    log_date=today,
                    daily_download=deltas["dl"],
                    daily_upload=deltas["ul"],
                    daily_uptime=deltas["time"],
                    accuracy_pct=accuracy_val,
                )
                .on_conflict_do_update(
                    constraint="unique_user_daily_raw",
                    set_={
                        "daily_download": HotspotUsageRaw.daily_download + deltas["dl"],
                        "daily_upload": HotspotUsageRaw.daily_upload + deltas["ul"],
                        "daily_uptime": HotspotUsageRaw.daily_uptime + deltas["time"],
                        "accuracy_pct": accuracy_val,
                    },
                )
            )
            await session.execute(stmt)

    # C. PPPoE Usage
    pppoe_deltas = {}
    for p in data.get("pppoe_details", []):
        user = p["user"]
        sess_id = p.get("id", user)
        curr_ul = p["rx_byte"]
        curr_dl = p["tx_byte"]

        d_ul, d_dl, _ = get_delta(
            _prev_stats[board_id_str]["pppoe"], sess_id, curr_ul, curr_dl
        )

        _prev_stats[board_id_str]["pppoe"][sess_id] = {
            "rx": curr_ul,
            "tx": curr_dl,
            "time": current_time,
        }

        if user not in pppoe_deltas:
            pppoe_deltas[user] = {"dl": 0, "ul": 0}
        pppoe_deltas[user]["dl"] += d_dl
        pppoe_deltas[user]["ul"] += d_ul

    for user, deltas in pppoe_deltas.items():
        # UPDATE 2.4.1: Skip saving if no activity and not first run to reduce DB noise
        if deltas["dl"] > 0 or deltas["ul"] > 0:
            stmt = (
                insert(BoardPppoeUsage)
                .values(
                    board_id=board_id,
                    pppoe_username=user,
                    log_date=today,
                    download_bytes=deltas["dl"],
                    upload_bytes=deltas["ul"],
                    accuracy_pct=accuracy_val,
                )
                .on_conflict_do_update(
                    constraint="unique_pppoe_daily",
                    set_={
                        "download_bytes": BoardPppoeUsage.download_bytes + deltas["dl"],
                        "upload_bytes": BoardPppoeUsage.upload_bytes + deltas["ul"],
                        "accuracy_pct": accuracy_val,
                        "last_update": func.now(),
                    },
                )
            )
            await session.execute(stmt)


async def _poll_board(board_id, sem: asyncio.Semaphore) -> None:
    # Rule 1.1: Jitter (jeda acak kecil) antar request router
    # UPDATE 2.4.1 Jitter: Sesuaikan jitter agar lebih merata (0-10 detik)
    await asyncio.sleep(random.uniform(0, 10))

    async with sem, SessionLocal() as session:
        # Fetch Board and Credentials with Eager Loading for Site (3NF V2.4)
        q = (
            select(MikrotikBoard)
            .options(joinedload(MikrotikBoard.site))
            .where(MikrotikBoard.board_id == board_id)
        )
        res = await session.execute(q)
        board = res.scalars().first()

        if not board:
            return

        # Fetch Credentials separately for security/simplicity
        q_cred = select(BoardCredential).where(BoardCredential.board_id == board_id)
        res_cred = await session.execute(q_cred)
        cred = res_cred.scalars().first()

        board_id_str = str(board.board_id)

        # Initialize metrics with default offline state
        metrics: Dict[str, Any] = {"is_online": False}

        if not cred or not getattr(cred, "username_mikrotik", None):
            return

        host = str(getattr(board, "ip_address", ""))
        port = int(getattr(board, "port_api", 8728) or 8728)
        username = str(getattr(cred, "username_mikrotik", ""))
        password = decrypt_password(str(getattr(cred, "password_mikrotik_encrypted", "")))

        loop = asyncio.get_running_loop()
        try:
            # Run blocking API call in executor
            data = await loop.run_in_executor(
                None, _get_api_data, host, username, password, port
            )
            if not data:
                metrics["is_online"] = False
                await alert_manager.check_health(session, board, metrics)
                return

            metrics.update(data)

            # --- Save Results & Calculate Delta ---
            current_time = time.time()
            today = date.today()
            await _save_polling_results(
                session, board_id, data, current_time, today, board_id_str
            )

            await session.commit()

        except Exception as e:
            logger.error(f"Polling failed for {board.board_name} ({host}): {e}")
            metrics["is_online"] = False
            await session.rollback()

        # Trigger Alert Logic
        try:
            await alert_manager.check_health(session, board, metrics)
        except Exception as e:
            logger.error(f"Alert manager failed for {board.board_name}: {e}")
