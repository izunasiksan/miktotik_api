
import asyncio
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Configuration
DB_URL = "postgresql+asyncpg://postgres:root@localhost:5432/db_master_mikrotik"
TARGET_UUID = "f63d3b50-aa21-4c6a-9adc-42f77dbc40ea"

async def seed_data():
    engine = create_async_engine(DB_URL, echo=True)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        print(f"--- Seeding Data for Board UUID: {TARGET_UUID} ---")

        # 1. Check if Board exists, if not create it
        check_board_query = text("SELECT board_id FROM mikrotik_boards WHERE board_id = :board_id")
        result = await session.execute(check_board_query, {"board_id": TARGET_UUID})
        board_exists = result.scalar()

        if not board_exists:
            print("Creating Board...")
            insert_board_query = text("""
                INSERT INTO mikrotik_boards (
                    board_id, board_name, mikrotik_identity, board_model, 
                    site_group, mac_address, ip_address, is_online, is_monitor
                ) VALUES (
                    :board_id, 'Router Utama Kantor', 'MikroTik-Main', 'RB750Gr3',
                    'Kantor Pusat', 'B8:69:F4:00:00:01', '192.168.88.1', TRUE, TRUE
                )
            """)
            await session.execute(insert_board_query, {"board_id": TARGET_UUID})
        else:
            print("Board already exists.")

        print("Creating 10 additional Boards...")
        insert_board_query_multi = text("""
            INSERT INTO mikrotik_boards (
                board_id, board_name, mikrotik_identity, board_model, 
                site_group, mac_address, ip_address, is_online, is_monitor
            ) VALUES (
                :board_id, :board_name, :mikrotik_identity, :board_model,
                :site_group, :mac_address, :ip_address, :is_online, TRUE
            )
        """)
        models = ["RB750Gr3", "hAP ac2", "CCR1009", "CRS326", "RB4011"]
        groups = ["Kantor Pusat", "Cabang A", "Cabang B", "Gudang", "Data Center"]
        new_board_ids = []
        for i in range(10):
            new_id = str(uuid.uuid4())
            name = f"Seed Router {i+1}"
            ident = f"Seed-{i+1}"
            model = random.choice(models)
            group = random.choice(groups)
            mac = ":".join(f"{random.randint(0, 255):02X}" for _ in range(6))
            ip = f"10.{20 + i}.0.1"
            online = random.choice([True, True, True, False])
            await session.execute(insert_board_query_multi, {
                "board_id": new_id,
                "board_name": name,
                "mikrotik_identity": ident,
                "board_model": model,
                "site_group": group,
                "mac_address": mac,
                "ip_address": ip,
                "is_online": online
            })
            new_board_ids.append(new_id)

        # 2. Insert Interface Configs (2 interfaces)
        print("Inserting Interface Configs...")
        interfaces = ["ether1-gateway", "bridge-local", "wlan1-hotspot"]
        for iface in interfaces:
            # Check if exists to avoid unique constraint error
            check_iface = text("""
                SELECT config_id FROM board_interface_configs 
                WHERE board_id = :board_id AND interface_name = :iface
            """)
            res = await session.execute(check_iface, {"board_id": TARGET_UUID, "iface": iface})
            if not res.scalar():
                await session.execute(text("""
                    INSERT INTO board_interface_configs (board_id, interface_name, interface_label, is_active)
                    VALUES (:board_id, :iface, :label, TRUE)
                """), {"board_id": TARGET_UUID, "iface": iface, "label": f"Interface {iface}"})

        print("Inserting Interface Configs for new Boards...")
        for nb in new_board_ids:
            for iface in interfaces:
                res = await session.execute(text("""
                    SELECT config_id FROM board_interface_configs 
                    WHERE board_id = :board_id AND interface_name = :iface
                """), {"board_id": nb, "iface": iface})
                if not res.scalar():
                    await session.execute(text("""
                        INSERT INTO board_interface_configs (board_id, interface_name, interface_label, is_active)
                        VALUES (:board_id, :iface, :label, TRUE)
                    """), {"board_id": nb, "iface": iface, "label": f"Interface {iface}"})

        # 3. Insert Historical Data (Stats) - Max 20 rows
        print("Inserting Historical Stats (Client, Resource, Speed)...")
        base_time = datetime.now()
        
        for i in range(20):
            # Time interval: every 5 minutes backwards
            log_time = base_time - timedelta(minutes=i*5)
            
            # Realistic Data
            # Client Stats
            hotspot_users = random.randint(15, 45)
            pppoe_users = random.randint(5, 12)
            
            # Resource Stats
            cpu_load = random.randint(5, 60)
            if i % 5 == 0: cpu_load += 20 # Spike every 5th record
            free_mem = 256 * 1024 * 1024 - random.randint(50, 150) * 1024 * 1024 # ~100-200MB free
            uptime_seconds = 86400 + (i * 300)
            uptime_interval = timedelta(seconds=uptime_seconds)
            
            # Speed Stats (Traffic)
            dl_mbps_ether1 = round(random.uniform(5.0, 50.0), 2)
            ul_mbps_ether1 = round(random.uniform(1.0, 10.0), 2)
            
            # Insert Client Stats
            await session.execute(text("""
                INSERT INTO board_client_stats (board_id, total_hotspot, total_pppoe, log_time)
                VALUES (:board_id, :hotspot, :pppoe, :log_time)
            """), {
                "board_id": TARGET_UUID, 
                "hotspot": hotspot_users, 
                "pppoe": pppoe_users, 
                "log_time": log_time
            })
            
            # Insert Resource Stats
            await session.execute(text("""
                INSERT INTO board_resource_stats (board_id, cpu_load, free_memory, uptime, log_time)
                VALUES (:board_id, :cpu, :mem, :uptime, :log_time)
            """), {
                "board_id": TARGET_UUID,
                "cpu": cpu_load,
                "mem": free_mem,
                "uptime": uptime_interval,
                "log_time": log_time
            })
            
            # Insert Speed Stats (ether1)
            await session.execute(text("""
                INSERT INTO board_speed_stats (board_id, interface_name, download_mbps, upload_mbps, log_time)
                VALUES (:board_id, 'ether1-gateway', :dl, :ul, :log_time)
            """), {
                "board_id": TARGET_UUID,
                "dl": dl_mbps_ether1,
                "ul": ul_mbps_ether1,
                "log_time": log_time
            })

        # 4. Insert VPN Profiles (2 rows)
        print("Inserting VPN Profiles...")
        vpn_profiles = [
            {"type": "l2tp-out", "user": "vpn-kantor-cabang", "ip": "10.10.10.2"},
            {"type": "ovpn-client", "user": "vpn-backup", "ip": "10.10.20.2"}
        ]
        for vpn in vpn_profiles:
            await session.execute(text("""
                INSERT INTO vpn_profiles (board_id, vpn_type, vpn_username, vpn_api, is_connected, last_connected_at)
                VALUES (:board_id, :type, :user, :ip, TRUE, NOW())
            """), {
                "board_id": TARGET_UUID,
                "type": vpn["type"],
                "user": vpn["user"],
                "ip": vpn["ip"]
            })

        # 5. Insert Board Events (5 rows)
        print("Inserting Board Events...")
        events = [
            {"cat": "connection", "lvl": "info", "name": "Router Online", "det": "Router connection established"},
            {"cat": "auth", "lvl": "warning", "name": "Login Failure", "det": "Failed login attempt from 192.168.88.254"},
            {"cat": "system", "lvl": "info", "name": "Backup Created", "det": "Daily backup executed successfully"},
            {"cat": "interface", "lvl": "info", "name": "Interface Up", "det": "ether2 link up (1Gbps)"},
            {"cat": "connection", "lvl": "critical", "name": "High Latency", "det": "Ping > 100ms to gateway"}
        ]
        for evt in events:
            await session.execute(text("""
                INSERT INTO board_events (board_id, event_category, event_level, event_name, event_detail, log_time)
                VALUES (:board_id, :cat, :lvl, :name, :det, NOW() - INTERVAL '1 hour')
            """), {
                "board_id": TARGET_UUID,
                "cat": evt["cat"],
                "lvl": evt["lvl"],
                "name": evt["name"],
                "det": evt["det"]
            })

        print("Inserting Board Events for new Boards...")
        for nb in new_board_ids:
            for evt in events:
                await session.execute(text("""
                    INSERT INTO board_events (board_id, event_category, event_level, event_name, event_detail, log_time)
                    VALUES (:board_id, :cat, :lvl, :name, :det, :log_time)
                """), {
                    "board_id": nb,
                    "cat": evt["cat"],
                    "lvl": evt["lvl"],
                    "name": evt["name"],
                    "det": evt["det"],
                    "log_time": datetime.now() - timedelta(hours=random.randint(1, 72))
                })

        # 6. Insert Backups (2 rows)
        print("Inserting Backups...")
        await session.execute(text("""
            INSERT INTO board_backups (board_id, file_name, router_name, file_location, status, log_date)
            VALUES 
            (:board_id, 'backup_20231025.rsc', 'MikroTik-Main', '/backups/backup_20231025.rsc', 'success', NOW() - INTERVAL '1 day'),
            (:board_id, 'backup_20231026.rsc', 'MikroTik-Main', '/backups/backup_20231026.rsc', 'success', NOW())
        """), {"board_id": TARGET_UUID})

        # 7. Insert Historical Data (30 Days)
        print("Inserting Historical Data (30 Days)...")
        
        # Prepare 30 days of data
        today = datetime.now().date()
        days_range = 30
        
        for i in range(days_range):
            log_date = today - timedelta(days=i)
            
            # Randomize stats
            avg_dl = round(random.uniform(10.0, 50.0), 2)
            max_dl = round(avg_dl * random.uniform(1.5, 3.0), 2)
            tot_dl = int(avg_dl * 1024 * 1024 * 3600 * 24 / 8) # Rough estimate
            
            avg_ul = round(random.uniform(2.0, 10.0), 2)
            max_ul = round(avg_ul * random.uniform(1.5, 3.0), 2)
            tot_ul = int(avg_ul * 1024 * 1024 * 3600 * 24 / 8)
            
            avg_cpu = int(random.uniform(5, 30))
            max_cpu = int(avg_cpu * random.uniform(1.2, 2.5))
            
            # 7a. Board Daily Summary
            await session.execute(text("""
                INSERT INTO board_daily_summary (
                    board_id, avg_download, max_download, total_download_bytes, 
                    avg_upload, max_upload, total_upload_bytes, 
                    avg_cpu_load, max_cpu_load, log_date
                ) VALUES (
                    :board_id, :avg_dl, :max_dl, :tot_dl, 
                    :avg_ul, :max_ul, :tot_ul, 
                    :avg_cpu, :max_cpu, :log_date
                )
                ON CONFLICT (board_id, log_date) DO NOTHING
            """), {
                "board_id": TARGET_UUID,
                "avg_dl": avg_dl, "max_dl": max_dl, "tot_dl": tot_dl,
                "avg_ul": avg_ul, "max_ul": max_ul, "tot_ul": tot_ul,
                "avg_cpu": avg_cpu, "max_cpu": max_cpu,
                "log_date": log_date
            })
            
            # 7b. Interface Usage (ether1-gateway)
            await session.execute(text("""
                INSERT INTO board_interface_usage (
                    board_id, interface_name, total_tx_bytes, total_rx_bytes, log_date
                ) VALUES (
                    :board_id, 'ether1-gateway', :tx, :rx, :log_date
                )
                ON CONFLICT (board_id, interface_name, log_date) DO NOTHING
            """), {
                "board_id": TARGET_UUID,
                "tx": tot_ul, "rx": tot_dl, "log_date": log_date
            })

            # 7c. PPPoE Usage (pppoe-user-1)
            await session.execute(text("""
                INSERT INTO board_pppoe_usage (
                    board_id, pppoe_username, upload_bytes, download_bytes, log_date
                ) VALUES (
                    :board_id, 'pppoe-user-1', :tx, :rx, :log_date
                )
                ON CONFLICT (board_id, pppoe_username, log_date) DO NOTHING
            """), {
                "board_id": TARGET_UUID,
                "tx": int(tot_ul * 0.1), "rx": int(tot_dl * 0.1), "log_date": log_date
            })

            # 7d. Hotspot Usage (hotspot-user-1)
            await session.execute(text("""
                INSERT INTO hotspot_usage_raw (
                    board_id, username, daily_download, daily_upload, daily_uptime, log_date
                ) VALUES (
                    :board_id, 'hotspot-user-1', :dl, :ul, 3600, :log_date
                )
                ON CONFLICT (username, board_id, log_date) DO NOTHING
            """), {
                "board_id": TARGET_UUID,
                "dl": int(tot_dl * 0.05), "ul": int(tot_ul * 0.05), "log_date": log_date
            })

        # 8. Insert Monthly Summary (Last 12 Months)
        print("Inserting Monthly Summary (12 Months)...")
        today = datetime.now().date()
        for i in range(12):
            # First day of the month
            log_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
            today = log_month # Move back month by month
            
            # Randomize monthly stats
            tot_dl = int(random.uniform(500, 2000) * 1024 * 1024 * 1024) # 500-2000 GB
            tot_ul = int(random.uniform(100, 500) * 1024 * 1024 * 1024)  # 100-500 GB
            
            avg_dl = int(tot_dl / (30 * 24 * 3600))
            max_dl = int(avg_dl * 3)
            
            avg_ul = int(tot_ul / (30 * 24 * 3600))
            max_ul = int(avg_ul * 3)
            
            avg_cpu = int(random.uniform(10, 40))
            max_cpu = int(avg_cpu * 1.5)

            await session.execute(text("""
                INSERT INTO board_monthly_summary (
                    board_id, log_month,
                    avg_download, max_download, total_download_bytes,
                    avg_upload, max_upload, total_upload_bytes,
                    avg_cpu_load, max_cpu_load,
                    avg_hotspot_users, max_hotspot_users,
                    created_at, updated_at
                ) VALUES (
                    :board_id, :log_month,
                    :avg_dl, :max_dl, :tot_dl,
                    :avg_ul, :max_ul, :tot_ul,
                    :avg_cpu, :max_cpu,
                    25, 45,
                    NOW(), NOW()
                )
                ON CONFLICT (board_id, log_month) DO NOTHING
            """), {
                "board_id": TARGET_UUID,
                "log_month": log_month,
                "avg_dl": avg_dl, "max_dl": max_dl, "tot_dl": tot_dl,
                "avg_ul": avg_ul, "max_ul": max_ul, "tot_ul": tot_ul,
                "avg_cpu": avg_cpu, "max_cpu": max_cpu
            })

        print("Inserting Daily Summary (30 Days) for new Boards...")
        days_range = 30
        for nb in new_board_ids:
            today_nb = datetime.now().date()
            for i in range(days_range):
                log_date = today_nb - timedelta(days=i)
                avg_dl = round(random.uniform(10.0, 50.0), 2)
                max_dl = round(avg_dl * random.uniform(1.5, 3.0), 2)
                tot_dl = int(avg_dl * 1024 * 1024 * 3600 * 24 / 8)
                avg_ul = round(random.uniform(2.0, 10.0), 2)
                max_ul = round(avg_ul * random.uniform(1.5, 3.0), 2)
                tot_ul = int(avg_ul * 1024 * 1024 * 3600 * 24 / 8)
                avg_cpu = int(random.uniform(5, 30))
                max_cpu = int(avg_cpu * random.uniform(1.2, 2.5))
                await session.execute(text("""
                    INSERT INTO board_daily_summary (
                        board_id, avg_download, max_download, total_download_bytes, 
                        avg_upload, max_upload, total_upload_bytes, 
                        avg_cpu_load, max_cpu_load, log_date
                    ) VALUES (
                        :board_id, :avg_dl, :max_dl, :tot_dl, 
                        :avg_ul, :max_ul, :tot_ul, 
                        :avg_cpu, :max_cpu, :log_date
                    )
                    ON CONFLICT (board_id, log_date) DO NOTHING
                """), {
                    "board_id": nb,
                    "avg_dl": avg_dl, "max_dl": max_dl, "tot_dl": tot_dl,
                    "avg_ul": avg_ul, "max_ul": max_ul, "tot_ul": tot_ul,
                    "avg_cpu": avg_cpu, "max_cpu": max_cpu,
                    "log_date": log_date
                })

        print("Inserting Interface/PPPoE/Hotspot Usage (30 Days) for new Boards...")
        for nb in new_board_ids:
            today_nb = datetime.now().date()
            for i in range(days_range):
                log_date = today_nb - timedelta(days=i)
                avg_dl = round(random.uniform(10.0, 50.0), 2)
                tot_dl = int(avg_dl * 1024 * 1024 * 3600 * 24 / 8)
                avg_ul = round(random.uniform(2.0, 10.0), 2)
                tot_ul = int(avg_ul * 1024 * 1024 * 3600 * 24 / 8)

                await session.execute(text("""
                    INSERT INTO board_interface_usage (
                        board_id, interface_name, total_tx_bytes, total_rx_bytes, log_date
                    ) VALUES (
                        :board_id, 'ether1-gateway', :tx, :rx, :log_date
                    )
                    ON CONFLICT (board_id, interface_name, log_date) DO NOTHING
                """), {
                    "board_id": nb,
                    "tx": tot_ul, "rx": tot_dl, "log_date": log_date
                })

                await session.execute(text("""
                    INSERT INTO board_pppoe_usage (
                        board_id, pppoe_username, upload_bytes, download_bytes, log_date
                    ) VALUES (
                        :board_id, 'pppoe-user-1', :tx, :rx, :log_date
                    )
                    ON CONFLICT (board_id, pppoe_username, log_date) DO NOTHING
                """), {
                    "board_id": nb,
                    "tx": int(tot_ul * 0.1), "rx": int(tot_dl * 0.1), "log_date": log_date
                })

                await session.execute(text("""
                    INSERT INTO hotspot_usage_raw (
                        board_id, username, daily_download, daily_upload, daily_uptime, log_date
                    ) VALUES (
                        :board_id, 'hotspot-user-1', :dl, :ul, 3600, :log_date
                    )
                    ON CONFLICT (username, board_id, log_date) DO NOTHING
                """), {
                    "board_id": nb,
                    "dl": int(tot_dl * 0.05), "ul": int(tot_ul * 0.05), "log_date": log_date
                })

        print("Inserting Monthly Summary (12 Months) for new Boards...")
        for nb in new_board_ids:
            today_nb = datetime.now().date()
            for i in range(12):
                log_month = (today_nb.replace(day=1) - timedelta(days=1)).replace(day=1)
                today_nb = log_month
                tot_dl = int(random.uniform(500, 2000) * 1024 * 1024 * 1024)
                tot_ul = int(random.uniform(100, 500) * 1024 * 1024 * 1024)
                avg_dl = int(tot_dl / (30 * 24 * 3600))
                max_dl = int(avg_dl * 3)
                avg_ul = int(tot_ul / (30 * 24 * 3600))
                max_ul = int(avg_ul * 3)
                avg_cpu = int(random.uniform(10, 40))
                max_cpu = int(avg_cpu * 1.5)
                await session.execute(text("""
                    INSERT INTO board_monthly_summary (
                        board_id, log_month,
                        avg_download, max_download, total_download_bytes,
                        avg_upload, max_upload, total_upload_bytes,
                        avg_cpu_load, max_cpu_load,
                        avg_hotspot_users, max_hotspot_users,
                        created_at, updated_at
                    ) VALUES (
                        :board_id, :log_month,
                        :avg_dl, :max_dl, :tot_dl,
                        :avg_ul, :max_ul, :tot_ul,
                        :avg_cpu, :max_cpu,
                        20, 40,
                        NOW(), NOW()
                    )
                    ON CONFLICT (board_id, log_month) DO NOTHING
                """), {
                    "board_id": nb,
                    "log_month": log_month,
                    "avg_dl": avg_dl, "max_dl": max_dl, "tot_dl": tot_dl,
                    "avg_ul": avg_ul, "max_ul": max_ul, "tot_ul": tot_ul,
                    "avg_cpu": avg_cpu, "max_cpu": max_cpu
                })

        await session.commit()
        print("✅ Data Seeding Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
