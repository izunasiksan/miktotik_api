import asyncio
import uuid
import random
import math
from datetime import datetime, timedelta, date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import json

# Configuration
DB_URL = "postgresql+asyncpg://postgres:root@localhost:5432/db_master_mikrotik"

# Definisi Board untuk Seeding
BOARDS = [
    {
        "id": "f63d3b50-aa21-4c6a-9adc-42f77dbc40ea",
        "name": "Main Router HQ",
        "identity": "MikroTik-HQ",
        "model": "CCR2004-1G-12S+2XS",
        "site": "Pusat",
        "ip": "192.168.1.1",
        "mac": "4C:5E:0C:00:00:01",
        "traffic_base": 150, # Mbps
        "users_base": 120,
        "is_online": True
    },
    {
        "id": "e2a3b4c5-d6e7-4f89-b0a1-c2d3e4f5a6b7",
        "name": "Branch Office Jakarta",
        "identity": "MT-JKT-BR01",
        "model": "RB4011iGS+RM",
        "site": "Jakarta",
        "ip": "10.10.1.1",
        "mac": "4C:5E:0C:00:00:02",
        "traffic_base": 60,
        "users_base": 50,
        "is_online": True
    },
    {
        "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        "name": "Branch Office Surabaya",
        "identity": "MT-SBY-BR02",
        "model": "RB1100AHx4",
        "site": "Surabaya",
        "ip": "10.20.1.1",
        "mac": "4C:5E:0C:00:00:03",
        "traffic_base": 40,
        "users_base": 30,
        "is_online": True
    },
    {
        "id": "f9e8d7c6-b5a4-4f3e-a2d1-c0b9a8f7e6d5",
        "name": "Warehouse Bekasi",
        "identity": "MT-BKS-WH",
        "model": "hAP ac3",
        "site": "Bekasi",
        "ip": "10.30.1.1",
        "mac": "4C:5E:0C:00:00:04",
        "traffic_base": 15,
        "users_base": 12,
        "is_online": True
    }
]

def get_diurnal_multiplier(hour):
    """Multiplier berdasarkan pola penggunaan harian (kantor)."""
    if 1 <= hour <= 5:
        return random.uniform(0.05, 0.15)
    elif 6 <= hour <= 8:
        return random.uniform(0.2, 0.4)
    elif 9 <= hour <= 12: # Puncak pagi
        return random.uniform(0.8, 1.0)
    elif 13 <= hour <= 14: # Istirahat
        return random.uniform(0.5, 0.7)
    elif 15 <= hour <= 17: # Puncak sore
        return random.uniform(0.8, 1.0)
    elif 18 <= hour <= 22:
        return random.uniform(0.3, 0.6)
    else:
        return random.uniform(0.1, 0.3)

async def seed_data():
    engine = create_async_engine(DB_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        print("--- STARTING ACCURATE MULTI-BOARD SEEDING ---")

        # 1. Bersihkan semua data lama
        print("Cleaning up old data...")
        tables_to_clean = [
            "audit_logs", "hotspot_usage_monthly", "hotspot_usage_raw", 
            "board_pppoe_usage", "board_interface_usage", "board_interface_configs",
            "board_backups", "board_events", "board_monthly_summary", 
            "board_interface_daily_summary", "board_daily_summary", 
            "board_speed_stats", "board_resource_stats", "board_client_stats",
            "vpn_profiles", "board_credentials", "user_board_access", "mikrotik_boards"
        ]
        for table in tables_to_clean:
            await session.execute(text(f"DELETE FROM {table}"))
        
        # Reset master_users (optional, but good for clean start)
        # await session.execute(text("DELETE FROM master_users"))
        
        # Ensure at least one user exists
        user_res = await session.execute(text("SELECT user_id FROM master_users LIMIT 1"))
        user = user_res.fetchone()
        if not user:
            user_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO master_users (user_id, username, password_hash, full_name, role)
                VALUES (:id, 'admin', 'pbkdf2:sha256:260000$xxxx', 'Administrator', 'admin')
            """), {"id": user_id})
        else:
            user_id = str(user[0])

        await session.commit()

        start_date = datetime.now() - timedelta(days=90)

        for board in BOARDS:
            bid = board["id"]
            print(f"Seeding Board: {board['name']} ({board['site']})...")

            # A. Insert Board
            await session.execute(text("""
                INSERT INTO mikrotik_boards (board_id, board_name, mikrotik_identity, board_model, site_group, ip_address, mac_address, is_online, is_monitor)
                VALUES (:id, :name, :ident, :model, :site, :ip, :mac, :online, TRUE)
            """), {
                "id": bid, "name": board["name"], "ident": board["identity"], 
                "model": board["model"], "site": board["site"], "ip": board["ip"], 
                "mac": board["mac"], "online": board["is_online"]
            })

            # B. Insert Interfaces
            interfaces = [
                {"name": "ether1-wan", "label": "WAN-UPLINK", "primary": True},
                {"name": "ether2-lan", "label": "LOCAL-LAN", "primary": False},
                {"name": "wlan1-hotspot", "label": "WIFI-GUEST", "primary": False}
            ]
            for iface in interfaces:
                await session.execute(text("""
                    INSERT INTO board_interface_configs (board_id, interface_name, interface_label, is_active, is_primary_uplink)
                    VALUES (:bid, :name, :label, TRUE, :primary)
                """), {"bid": bid, "name": iface["name"], "label": iface["label"], "primary": iface["primary"]})

            # C. Generate Historis (90 Hari)
            for d in range(91):
                current_date = (start_date + timedelta(days=d)).date()
                is_weekend = current_date.weekday() >= 5
                day_mult = 0.3 if is_weekend else 1.0
                
                daily_stats = {
                    "dl_total": 0, "ul_total": 0, "dl_max": 0, "ul_max": 0,
                    "cpu_sum": 0, "cpu_max": 0, "mem_min": 1024, "hs_max": 0, "pppoe_max": 0, "count": 0
                }

                # Per Jam
                for hour in range(24):
                    multiplier = get_diurnal_multiplier(hour) * day_mult
                    
                    # Anomali (1% chance)
                    is_anomaly = random.random() < 0.01
                    if is_anomaly: multiplier *= 5.0

                    dl = random.uniform(board["traffic_base"]*0.4, board["traffic_base"]) * multiplier
                    ul = dl * 0.15
                    cpu = min(99, (random.uniform(2, 25) * multiplier) + (35 if is_anomaly else 0))
                    mem = max(16, 1024 - (cpu * 2)) # MB
                    hs = int(board["users_base"] * 0.7 * multiplier)
                    pppoe = int(board["users_base"] * 0.3 * multiplier)

                    # Accumulate bytes (MB to Bytes)
                    bytes_dl = int(dl * 3600 / 8 * 1024 * 1024)
                    bytes_ul = int(ul * 3600 / 8 * 1024 * 1024)
                    daily_stats["dl_total"] += bytes_dl
                    daily_stats["ul_total"] += bytes_ul
                    daily_stats["dl_max"] = max(daily_stats["dl_max"], dl)
                    daily_stats["ul_max"] = max(daily_stats["ul_max"], ul)
                    daily_stats["cpu_sum"] += cpu
                    daily_stats["cpu_max"] = max(daily_stats["cpu_max"], cpu)
                    daily_stats["mem_min"] = min(daily_stats["mem_min"], mem)
                    daily_stats["hs_max"] = max(daily_stats["hs_max"], hs)
                    daily_stats["pppoe_max"] = max(daily_stats["pppoe_max"], pppoe)
                    daily_stats["count"] += 1

                    # Log detail hanya 7 hari terakhir
                    if d >= 84:
                        lt = datetime.combine(current_date, datetime.min.time()) + timedelta(hours=hour)
                        # Resource Stats
                        await session.execute(text("INSERT INTO board_resource_stats (board_id, cpu_load, free_memory, log_time) VALUES (:bid, :cpu, :mem, :lt)"),
                                            {"bid": bid, "cpu": int(cpu), "mem": int(mem*1024*1024), "lt": lt})
                        # Speed Stats (WAN)
                        await session.execute(text("INSERT INTO board_speed_stats (board_id, interface_name, download_mbps, upload_mbps, log_time) VALUES (:bid, 'ether1-wan', :dl, :ul, :lt)"),
                                            {"bid": bid, "dl": dl, "ul": ul, "lt": lt})
                        # Client Stats
                        await session.execute(text("INSERT INTO board_client_stats (board_id, total_hotspot, total_pppoe, log_time) VALUES (:bid, :hs, :pppoe, :lt)"),
                                            {"bid": bid, "hs": hs, "pppoe": pppoe, "lt": lt})

                # Daily Summary
                await session.execute(text("""
                    INSERT INTO board_daily_summary (
                        board_id, log_date, avg_download, max_download, total_download_bytes,
                        avg_upload, max_upload, total_upload_bytes, avg_cpu_load, max_cpu_load,
                        min_free_memory, avg_hotspot_users, max_hotspot_users, avg_pppoe_users, max_pppoe_users
                    ) VALUES (
                        :bid, :ld, :adl, :mdl, :tdl, :aul, :mul, :tul, :acpu, :mcpu, :mmem, :ahs, :mhs, :appp, :mppp
                    )
                """), {
                    "bid": bid, "ld": current_date,
                    "adl": daily_stats["dl_total"] / (24 * 3600 * 1024 * 1024 / 8),
                    "mdl": daily_stats["dl_max"], "tdl": int(daily_stats["dl_total"]),
                    "aul": daily_stats["ul_total"] / (24 * 3600 * 1024 * 1024 / 8),
                    "mul": daily_stats["ul_max"], "tul": int(daily_stats["ul_total"]),
                    "acpu": int(daily_stats["cpu_sum"]/24), "mcpu": int(daily_stats["cpu_max"]),
                    "mmem": int(daily_stats["mem_min"]*1024*1024), 
                    "ahs": int(daily_stats["hs_max"]*0.5), "mhs": daily_stats["hs_max"],
                    "appp": int(daily_stats["pppoe_max"]*0.5), "mppp": daily_stats["pppoe_max"]
                })

                # Interface Daily Usage
                for iface in interfaces:
                    if iface["name"] == "ether1-wan":
                        tx = daily_stats["ul_total"]
                        rx = daily_stats["dl_total"]
                    else:
                        tx = int(daily_stats["dl_total"] * 0.4)
                        rx = int(daily_stats["ul_total"] * 0.4)
                    
                    await session.execute(text("""
                        INSERT INTO board_interface_usage (board_id, interface_name, total_tx_bytes, total_rx_bytes, log_date)
                        VALUES (:bid, :name, :tx, :rx, :ld)
                    """), {"bid": bid, "name": iface["name"], "tx": tx, "rx": rx, "ld": current_date})

                # PPPoE Usage (Simulasi 3 user per board)
                for i in range(1, 4):
                    uname = f"user{i}_{board['identity'].lower()}"
                    u_dl = int(daily_stats["dl_total"] * random.uniform(0.05, 0.2))
                    u_ul = int(u_dl * 0.1)
                    await session.execute(text("""
                        INSERT INTO board_pppoe_usage (board_id, pppoe_username, download_bytes, upload_bytes, log_date)
                        VALUES (:bid, :user, :dl, :ul, :ld)
                    """), {"bid": bid, "user": uname, "dl": u_dl, "ul": u_ul, "ld": current_date})

                # Hotspot Usage Raw (Simulasi 5 user per board)
                for i in range(1, 6):
                    hname = f"hotspot{i}_{board['identity'].lower()}"
                    h_dl = int(daily_stats["dl_total"] * random.uniform(0.02, 0.1))
                    h_ul = int(h_dl * 0.1)
                    h_upt = random.randint(3600, 28800)
                    await session.execute(text("""
                        INSERT INTO hotspot_usage_raw (board_id, username, daily_download, daily_upload, daily_uptime, log_date)
                        VALUES (:bid, :user, :dl, :ul, :upt, :ld)
                    """), {"bid": bid, "user": hname, "dl": h_dl, "ul": h_ul, "upt": h_upt, "ld": current_date})

            # D. Events & Audit Logs
            print(f"Generating Events for {board['name']}...")
            event_types = [
                ('connection', 'critical', 'Router Offline', 'Ping timeout detected from monitoring node'),
                ('connection', 'info', 'Router Online', 'Connection re-established'),
                ('system', 'warning', 'High CPU Usage', 'CPU load exceeded 90% for 5 minutes'),
                ('auth', 'warning', 'Failed Login', 'Multiple failed login attempts from IP 1.2.3.4')
            ]
            for _ in range(15):
                lt = datetime.now() - timedelta(hours=random.randint(1, 500))
                etype = random.choice(event_types)
                await session.execute(text("""
                    INSERT INTO board_events (board_id, event_category, event_level, event_name, event_detail, log_time)
                    VALUES (:bid, :cat, :lvl, :name, :det, :lt)
                """), {"bid": bid, "cat": etype[0], "lvl": etype[1], "name": etype[2], "det": etype[3], "lt": lt})

            # Audit Logs
            await session.execute(text("""
                INSERT INTO audit_logs (user_id, action, target_resource, details, status)
                VALUES (:uid, 'UPDATE_CONFIG', :target, :details, 'SUCCESS')
            """), {
                "uid": user_id, 
                "target": f"Board: {board['name']}", 
                "details": json.dumps({"change": "Updated interface ether1 label", "board_id": bid})
            })

            # E. VPN Profiles
            if board["site"] in ["Pusat", "Jakarta"]:
                await session.execute(text("""
                    INSERT INTO vpn_profiles (board_id, vpn_type, vpn_username, vpn_api, is_connected, last_connected_at)
                    VALUES (:bid, 'L2TP', :user, 'vpn.domain.com', TRUE, :now)
                """), {"bid": bid, "user": f"vpn_{board['identity'].lower()}", "now": datetime.now()})

            # F. Backups
            for i in range(3):
                b_date = datetime.now() - timedelta(days=i*30)
                await session.execute(text("""
                    INSERT INTO board_backups (board_id, file_name, router_name, router_model, file_location, status, log_date)
                    VALUES (:bid, :fname, :rname, :model, :floc, 'success', :ld)
                """), {
                    "bid": bid, "fname": f"backup_{board['identity']}_{b_date.strftime('%Y%m%d')}.backup", 
                    "rname": board["name"], "model": board["model"], 
                    "floc": f"/backups/{bid}/{i}.backup", "ld": b_date
                })

        # 2. Monthly Summary (Agregasi dari Daily)
        print("Generating Monthly Summaries...")
        await session.execute(text("""
            INSERT INTO board_monthly_summary (
                board_id, log_month, avg_download, max_download, total_download_bytes,
                avg_upload, max_upload, total_upload_bytes, avg_cpu_load, max_cpu_load,
                avg_hotspot_users, max_hotspot_users
            )
            SELECT 
                board_id, DATE_TRUNC('month', log_date)::date,
                AVG(avg_download), MAX(max_download), SUM(total_download_bytes),
                AVG(avg_upload), MAX(max_upload), SUM(total_upload_bytes),
                AVG(avg_cpu_load), MAX(max_cpu_load),
                AVG(avg_hotspot_users), MAX(max_hotspot_users)
            FROM board_daily_summary
            GROUP BY 1, 2
            ON CONFLICT (board_id, log_month) DO NOTHING
        """))

        # Hotspot Monthly Summary
        await session.execute(text("""
            INSERT INTO hotspot_usage_monthly (username, total_download, total_upload, total_uptime, frequency_days, month_period, is_frequent_user)
            SELECT 
                username, SUM(daily_download), SUM(daily_upload), SUM(daily_uptime), 
                COUNT(log_date), DATE_TRUNC('month', log_date)::date,
                CASE WHEN COUNT(log_date) > 15 THEN TRUE ELSE FALSE END
            FROM hotspot_usage_raw
            GROUP BY 1, 6
            ON CONFLICT (username, month_period) DO NOTHING
        """))

        await session.commit()
        print("--- MULTI-BOARD SEEDING COMPLETED SUCCESSFULLY ---")

if __name__ == "__main__":
    asyncio.run(seed_data())
