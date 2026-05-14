import asyncio
import asyncpg
import uuid
import random
import json
from datetime import datetime, timedelta, date
from faker import Faker
from passlib.hash import argon2

# ============================================================
# CONFIGURATION
# ============================================================
DB_URL = "postgresql://postgres:root@localhost:5432/db_master_mikrotik"
NUM_BOARDS = 10
NUM_USERS = 15
DAYS_OF_HISTORY = 30  # For speed, we'll use 30 days of high-frequency data
fake = Faker()

# ============================================================
# UTILITIES
# ============================================================
def hash_password(password: str) -> str:
    return argon2.hash(password)

async def create_partitions(conn, start_date: date, end_date: date):
    """
    Membuat partisi bulanan untuk tabel-tabel yang dipartisi.
    """
    partitioned_tables = [
        "board_client_stats",
        "board_resource_stats",
        "board_speed_stats",
        "board_events",
        "board_interface_usage",
        "board_pppoe_usage",
        "hotspot_usage_raw"
    ]
    
    current = start_date.replace(day=1)
    while current <= end_date:
        next_month = (current + timedelta(days=32)).replace(day=1)
        suffix = current.strftime("%Y_%m")
        start_str = current.strftime("%Y-%m-%d")
        end_str = next_month.strftime("%Y-%m-%d")
        
        for table in partitioned_tables:
            partition_name = f"{table}_{suffix}"
            exists = await conn.fetchval(
                "SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = $1)",
                partition_name
            )
            if not exists:
                print(f"Creating partition {partition_name} ({start_str} to {end_str})")
                await conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {partition_name} 
                    PARTITION OF {table} 
                    FOR VALUES FROM ('{start_str}') TO ('{end_str}')
                """)
        current = next_month

async def reset_sequences(conn):
    """
    Reset all sequences to 1.
    """
    sequences = await conn.fetch("""
        SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relkind = 'S' AND n.nspname = 'public'
    """)
    for seq in sequences:
        await conn.execute(f"ALTER SEQUENCE {seq['relname']} RESTART WITH 1")

# ============================================================
# MAIN SEEDING LOGIC
# ============================================================
async def seed_v241():
    conn = await asyncpg.connect(DB_URL)
    print("--- 🚀 Starting Seeding Version 2.4.1 ---")
    
    try:
        # PHASE 1: CLEANUP
        print("PHASE 1: Cleaning up existing data...")
        await conn.execute("""
            TRUNCATE 
                master_roles, master_sites, master_board_models, 
                master_users, mikrotik_boards, 
                board_credentials, vpn_profiles, board_interface_configs, 
                user_board_access, telegram_bots, telegram_recipients,
                board_backups, automation_jobs, automation_logs, ztp_queue, audit_logs,
                board_client_stats, board_resource_stats, board_speed_stats, board_events,
                board_interface_usage, board_pppoe_usage, hotspot_usage_raw, hotspot_usage_monthly,
                board_daily_summary, board_interface_daily_summary, board_monthly_summary
            RESTART IDENTITY CASCADE
        """)
        await reset_sequences(conn)
        
        # PHASE 2: MASTER DATA (3NF)
        print("PHASE 2: Seeding Master Data (3NF)...")
        
        # Roles
        roles_data = [
            ('admin', json.dumps(['all'])),
            ('teknisi', json.dumps(['read', 'write_config'])),
            ('viewer', json.dumps(['read_only']))
        ]
        role_ids = []
        for name, perms in roles_data:
            rid = await conn.fetchval(
                "INSERT INTO master_roles (role_name, permissions) VALUES ($1, $2) RETURNING role_id",
                name, perms
            )
            role_ids.append(rid)
        
        # Sites
        sites_data = [
            ('Jakarta-Pusat', 'Jl. Merdeka No. 1', 'Budi Santoso', '08123456789'),
            ('Bandung-Dago', 'Jl. Dago No. 100', 'Siti Aminah', '08123456788'),
            ('Surabaya-Gubeng', 'Jl. Gubeng No. 5', 'Joko Susilo', '08123456787'),
            ('Medan-Kota', 'Jl. Sudirman No. 20', 'Ani Wijaya', '08123456786'),
            ('Makassar-Panakkukang', 'Jl. Panakkukang No. 3', 'Andi Pratama', '08123456785')
        ]
        site_ids = []
        for name, loc, pic, phone in sites_data:
            sid = await conn.fetchval(
                "INSERT INTO master_sites (site_name, location, pic_name, pic_phone) VALUES ($1, $2, $3, $4) RETURNING site_id",
                name, loc, pic, phone
            )
            site_ids.append(sid)
            
        # Board Models
        models_data = [
            ('RB4011iGS+5HacQ2nD-IN', 'AL21400', 4, 1024*1024*1024),
            ('CCR1009-7G-1C-1S+', 'TLR4-00980', 9, 2*1024*1024*1024),
            ('hEX lite', 'QCA9533', 1, 64*1024*1024),
            ('RB750Gr3', 'MT7621A', 2, 256*1024*1024),
            ('CCR2004-16G-2S+', 'AL32400', 4, 4*1024*1024*1024)
        ]
        model_ids = []
        for name, cpu, cores, ram in models_data:
            mid = await conn.fetchval(
                "INSERT INTO master_board_models (model_name, cpu_model, core_count, total_memory) VALUES ($1, $2, $3, $4) RETURNING model_id",
                name, cpu, cores, ram
            )
            model_ids.append(mid)
            
        # PHASE 3: CORE ASSETS
        print(f"PHASE 3: Seeding {NUM_USERS} Users and {NUM_BOARDS} Boards...")
        
        # Users
        user_ids = []
        # Admin & Dev
        for uname, fname in [('admin', 'System Admin'), ('developer', 'Dev Admin')]:
            uid = await conn.fetchval(
                "INSERT INTO master_users (username, password_hash, full_name, role_id) VALUES ($1, $2, $3, $4) RETURNING user_id",
                uname, hash_password(f"{uname}123"), fname, role_ids[0]
            )
            user_ids.append(uid)
            
        for i in range(NUM_USERS - 2):
            role_id = role_ids[1] if i < 8 else role_ids[2]
            uid = await conn.fetchval(
                "INSERT INTO master_users (username, password_hash, full_name, role_id) VALUES ($1, $2, $3, $4) RETURNING user_id",
                fake.user_name(), hash_password("pass123"), fake.name(), role_id
            )
            user_ids.append(uid)
            
        # Boards
        board_ids = []
        for i in range(NUM_BOARDS):
            site_id = random.choice(site_ids)
            model_id = random.choice(model_ids)
            bid = await conn.fetchval(
                """INSERT INTO mikrotik_boards 
                   (board_name, mikrotik_identity, model_id, site_id, mac_address, ip_address, is_online) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING board_id""",
                f"Router-{fake.city()}", f"Mikrotik-{i+1}", model_id, site_id, 
                fake.mac_address(), f"192.168.{i+10}.1", True
            )
            board_ids.append(bid)
            
            # Credentials
            await conn.execute(
                "INSERT INTO board_credentials (board_id, username_mikrotik, password_mikrotik_encrypted) VALUES ($1, $2, $3)",
                bid, "admin", "ENCRYPTED_DUMMY_PWD"
            )
            
            # VPN Profile
            await conn.execute(
                "INSERT INTO vpn_profiles (board_id, vpn_type, vpn_api, vpn_username, vpn_password_encrypted, is_connected) VALUES ($1, $2, $3, $4, $5, $6)",
                bid, "L2TP/IPSEC", f"vpn-{i+1}.example.com", f"vpn_user_{i}", "ENCRYPTED_VPN_PWD", True
            )
            
            # Interface Config
            await conn.execute(
                "INSERT INTO board_interface_configs (board_id, interface_name, interface_label, is_primary_uplink) VALUES ($1, $2, $3, $4)",
                bid, "ether1", "Uplink ISP", True
            )
            
        # PHASE 4: RELATIONSHIPS & CONFIG
        print("PHASE 4: Seeding Relationships & Telegram Config...")
        # Access
        for uid in user_ids:
            for bid in random.sample(board_ids, k=min(3, len(board_ids))):
                await conn.execute(
                    "INSERT INTO user_board_access (user_id, board_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    uid, bid
                )
                
        # Telegram
        bot_id = await conn.fetchval(
            "INSERT INTO telegram_bots (bot_name, bot_token) VALUES ($1, $2) RETURNING bot_id",
            "MikrotikMonitorBot", "123456789:ABCDEF-GHIJKL"
        )
        for uid in user_ids[:5]:
            await conn.execute(
                "INSERT INTO telegram_recipients (user_id, bot_id, board_id, chat_id) VALUES ($1, $2, $3, $4)",
                uid, bot_id, random.choice(board_ids), random.randint(100000, 999999)
            )
            
        # PHASE 5: OPERATIONAL DATA
        print("PHASE 5: Seeding Operational Data (Automation, ZTP, Audit)...")
        # ZTP
        for _ in range(5):
            await conn.execute(
                "INSERT INTO ztp_queue (mac_address, ip_address, identity, model, status) VALUES ($1, $2, $3, $4, $5)",
                fake.mac_address(), fake.ipv4(), fake.domain_word(), random.choice(models_data)[0], 'pending'
            )
            
        # Audit Logs
        for uid in user_ids[:3]:
            await conn.execute(
                "INSERT INTO audit_logs (user_id, action, target_resource, details, ip_address) VALUES ($1, $2, $3, $4, $5)",
                uid, 'LOGIN', 'auth', json.dumps({'method': 'web'}), fake.ipv4()
            )
            
        # PHASE 6: HISTORICAL DATA
        print(f"PHASE 6: Generating {DAYS_OF_HISTORY} days of historical stats...")
        today = date.today()
        start_history = today - timedelta(days=DAYS_OF_HISTORY)
        await create_partitions(conn, start_history, today + timedelta(days=31))
        
        current_time = datetime.now() - timedelta(days=DAYS_OF_HISTORY)
        end_time = datetime.now()
        
        while current_time <= end_time:
            log_date = current_time.date()
            for bid in board_ids:
                # Stats (Every 12 hours for seeding speed)
                for hour in [0, 12]:
                    sample_time = datetime.combine(log_date, datetime.min.time()) + timedelta(hours=hour)
                    if sample_time > end_time: continue
                    
                    # Resource
                    await conn.execute(
                        "INSERT INTO board_resource_stats (board_id, cpu_load, free_memory, free_hdd, log_time) VALUES ($1, $2, $3, $4, $5)",
                        bid, random.randint(5, 70), random.randint(100, 1024)*1024*1024, 2048*1024*1024, sample_time
                    )
                    
                    # Client
                    await conn.execute(
                        "INSERT INTO board_client_stats (board_id, total_hotspot, total_pppoe, log_time) VALUES ($1, $2, $3, $4)",
                        bid, random.randint(10, 100), random.randint(5, 50), sample_time
                    )
                    
                    # Speed
                    await conn.execute(
                        "INSERT INTO board_speed_stats (board_id, interface_name, download_mbps, upload_mbps, log_time) VALUES ($1, $2, $3, $4, $5)",
                        bid, "ether1", random.uniform(10, 100), random.uniform(2, 20), sample_time
                    )
                
                # Usage
                await conn.execute(
                    "INSERT INTO board_interface_usage (board_id, interface_name, total_tx_bytes, total_rx_bytes, log_date) VALUES ($1, $2, $3, $4, $5)",
                    bid, "ether1", random.randint(1, 10)*1024**3, random.randint(5, 50)*1024**3, log_date
                )
                
                # Daily Summary
                await conn.execute(
                    """INSERT INTO board_daily_summary 
                       (board_id, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, log_date) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING""",
                    bid, 50.0, 120.0, random.randint(10, 100)*1024**3, 15.0, 30.0, random.randint(2, 20)*1024**3, log_date
                )

                # PPPoE Usage (Every 12 hours)
                for hour in [0, 12]:
                    sample_time = datetime.combine(log_date, datetime.min.time()) + timedelta(hours=hour)
                    if sample_time > end_time: continue
                    await conn.execute(
                        """INSERT INTO board_pppoe_usage 
                           (board_id, pppoe_username, upload_bytes, download_bytes, log_date) 
                           VALUES ($1, $2, $3, $4, $5)""",
                        bid, f"user_pppoe_{random.randint(1, 50)}", 
                        random.randint(1, 100)*1024**2, random.randint(1, 500)*1024**2, log_date
                    )

                # Hotspot Usage Raw (Every 12 hours)
                for hour in [0, 12]:
                    sample_time = datetime.combine(log_date, datetime.min.time()) + timedelta(hours=hour)
                    if sample_time > end_time: continue
                    await conn.execute(
                        """INSERT INTO hotspot_usage_raw 
                           (board_id, username, daily_download, daily_upload, daily_uptime, log_date) 
                           VALUES ($1, $2, $3, $4, $5, $6)""",
                        bid, f"user_hs_{random.randint(1, 50)}", 
                        random.randint(1, 500)*1024**2, random.randint(1, 100)*1024**2, 
                        random.randint(3600, 28800), log_date
                    )
            
            # Monthly Summary & Hotspot Monthly (Run on 1st day of month)
            if log_date.day == 1:
                print(f"  Generating Monthly Summaries for {log_date.strftime('%B %Y')}...")
                for bid in board_ids:
                    # Board Monthly Summary
                    await conn.execute(
                        """INSERT INTO board_monthly_summary 
                           (board_id, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, log_month) 
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING""",
                        bid, 45.0, 150.0, random.randint(300, 3000)*1024**3, 12.0, 40.0, random.randint(50, 500)*1024**3, log_date.replace(day=1)
                    )
                    
                    # Hotspot Usage Monthly
                    for _ in range(5): # Top 5 users per month
                        await conn.execute(
                            """INSERT INTO hotspot_usage_monthly 
                               (username, total_download, total_upload, total_uptime, month_period) 
                               VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING""",
                            f"user_hs_{random.randint(1, 50)}", 
                            random.randint(10, 100)*1024**3, random.randint(1, 10)*1024**3, 
                            random.randint(3600, 3600*24*30), log_date.replace(day=1)
                        )

                print(f"  Progress: Seeded up to {log_date}")
            current_time += timedelta(days=1)
            
        # PHASE 7: VALIDATION
        print("\n--- ✅ VALIDATION: INTEGRITY CHECKS ---")
        checks = [
            ("Master Roles", "SELECT COUNT(*) FROM master_roles"),
            ("Master Users", "SELECT COUNT(*) FROM master_users"),
            ("Mikrotik Boards", "SELECT COUNT(*) FROM mikrotik_boards"),
            ("PPPoE Usage Logs", "SELECT COUNT(*) FROM board_pppoe_usage"),
            ("Hotspot Usage Raw", "SELECT COUNT(*) FROM hotspot_usage_raw"),
            ("Hotspot Usage Monthly", "SELECT COUNT(*) FROM hotspot_usage_monthly"),
            ("Board Monthly Summary", "SELECT COUNT(*) FROM board_monthly_summary"),
            ("Orphan Users (No Role)", "SELECT COUNT(*) FROM master_users WHERE role_id IS NULL"),
            ("Orphan Boards (No Site)", "SELECT COUNT(*) FROM mikrotik_boards WHERE site_id IS NULL"),
            ("ZTP Queue Pending", "SELECT COUNT(*) FROM ztp_queue WHERE status = 'pending'")
        ]
        for label, query in checks:
            count = await conn.fetchval(query)
            status = "PASS" if (count > 0 and "Orphan" not in label) or (count == 0 and "Orphan" in label) else "FAIL"
            print(f"[{status}] {label}: {count}")

        print("\n--- 🎉 Seeding Completed Successfully (v2.4.1) ---")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_v241())
