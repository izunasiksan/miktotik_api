import asyncio
import asyncpg
import uuid
import random
import math
from datetime import datetime, timedelta, date
from faker import Faker
from passlib.hash import argon2

# Configuration
DB_URL = "postgresql://postgres:root@localhost:5432/db_master_mikrotik"
NUM_BOARDS = 5
NUM_USERS = 7
DAYS_OF_HISTORY = 365  # 1 Year of historical data
fake = Faker()

# Password hashing for master_users
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
            # Check if partition exists
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

async def seed_data():
    conn = await asyncpg.connect(DB_URL)
    print("--- Connected to Database ---")
    
    try:
        # 1. TRUNCATE ALL DATA (CASCADE handles dependencies)
        print("Truncating existing data...")
        await conn.execute("TRUNCATE master_users, mikrotik_boards, telegram_bots, automation_jobs, ztp_queue RESTART IDENTITY CASCADE")
        
        # 2. CREATE PARTITIONS
        today = date.today()
        start_history = today - timedelta(days=DAYS_OF_HISTORY)
        print(f"Generating partitions for the last {DAYS_OF_HISTORY} days...")
        await create_partitions(conn, start_history, today + timedelta(days=31))
        
        # 3. SEED MASTER USERS
        print(f"Seeding {NUM_USERS} users...")
        user_ids = []
        roles = ['admin', 'teknisi', 'viewer']
        
        # Admin user
        admin_id = uuid.uuid4()
        await conn.execute(
            "INSERT INTO master_users (user_id, username, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)",
            admin_id, "admin", hash_password("admin123"), "System Administrator", "admin"
        )
        user_ids.append(admin_id)
        
        # Developer user (Requested by User)
        dev_id = uuid.uuid4()
        await conn.execute(
            "INSERT INTO master_users (user_id, username, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)",
            dev_id, "developer", hash_password("developer123"), "Developer Admin", "admin"
        )
        user_ids.append(dev_id)
        
        for i in range(NUM_USERS - 2):
            uid = uuid.uuid4()
            role = roles[1] if i < 4 else roles[2] # 4 teknisi, rest viewer
            await conn.execute(
                "INSERT INTO master_users (user_id, username, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)",
                uid, fake.user_name(), hash_password("pass123"), fake.name(), role
            )
            user_ids.append(uid)
            
        # 4. SEED MIKROTIK BOARDS
        print(f"Seeding {NUM_BOARDS} boards...")
        board_ids = []
        models = ["RB4011iGS+5HacQ2nD-IN", "CCR1009-7G-1C-1S+", "hEX lite", "RB750Gr3", "CCR2004-16G-2S+"]
        sites = ["Jakarta-Pusat", "Bandung-Dago", "Surabaya-Gubeng", "Medan-Kota", "Makassar-Panakkukang"]
        
        for i in range(NUM_BOARDS):
            bid = uuid.uuid4()
            await conn.execute(
                """INSERT INTO mikrotik_boards 
                   (board_id, board_name, mikrotik_identity, board_model, site_group, mac_address, ip_address, is_online) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                bid, f"Router-{sites[i]}", f"Mikrotik-{sites[i]}", models[i], sites[i], 
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
            
            # Interface Config (Ether1 as uplink)
            await conn.execute(
                "INSERT INTO board_interface_configs (board_id, interface_name, interface_label, is_primary_uplink) VALUES ($1, $2, $3, $4)",
                bid, "ether1", "Uplink ISP", True
            )
            await conn.execute(
                "INSERT INTO board_interface_configs (board_id, interface_name, interface_label, is_primary_uplink) VALUES ($1, $2, $3, $4)",
                bid, "bridge-local", "Local Network", False
            )
            
        # 5. USER BOARD ACCESS
        print("Seeding user board access...")
        for uid in user_ids:
            # Everyone has access to all boards for testing simplicity
            for bid in board_ids:
                await conn.execute(
                    "INSERT INTO user_board_access (user_id, board_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    uid, bid
                )
                
        # 6. TELEGRAM BOTS
        print("Seeding telegram bots...")
        await conn.execute(
            "INSERT INTO telegram_bots (bot_name, bot_token) VALUES ($1, $2)",
            "MikrotikMonitorBot", "123456789:ABCDEF-GHIJKL"
        )
        
        # 7. HISTORICAL DATA GENERATION (1 YEAR)
        print(f"Generating historical data for {NUM_BOARDS} boards over {DAYS_OF_HISTORY} days...")
        
        # Counter for BIGINT primary keys (manual because we changed from BIGSERIAL)
        stat_counter = 1
        res_counter = 1
        speed_counter = 1
        event_counter = 1
        usage_counter = 1
        
        # Iterate days
        current_time = datetime.now() - timedelta(days=DAYS_OF_HISTORY)
        end_time = datetime.now()
        
        # To speed up, we'll insert in chunks or daily
        while current_time <= end_time:
            log_date = current_time.date()
            
            for bid in board_ids:
                # --- Stage 0: Basic Stats (Every 6 hours to keep it light but enough for trends) ---
                for hour in [0, 6, 12, 18]:
                    sample_time = datetime.combine(log_date, datetime.min.time()) + timedelta(hours=hour)
                    if sample_time > end_time: continue
                    
                    # Client Stats
                    hotspot = random.randint(10, 50)
                    pppoe = random.randint(5, 30)
                    await conn.execute(
                        "INSERT INTO board_client_stats (stat_id, board_id, total_hotspot, total_pppoe, log_time) VALUES ($1, $2, $3, $4, $5)",
                        stat_counter, bid, hotspot, pppoe, sample_time
                    )
                    stat_counter += 1
                    
                    # Resource Stats
                    cpu = random.randint(5, 60)
                    mem = random.randint(100, 512) * 1024 * 1024 # MB to bytes
                    await conn.execute(
                        "INSERT INTO board_resource_stats (resource_id, board_id, cpu_load, free_memory, free_hdd, log_time) VALUES ($1, $2, $3, $4, $5, $6)",
                        res_counter, bid, cpu, mem, 1024*1024*1024, sample_time # 1GB HDD
                    )
                    res_counter += 1
                    
                    # Speed Stats (ether1)
                    dl = round(random.uniform(5.0, 95.0), 2)
                    ul = round(random.uniform(1.0, 20.0), 2)
                    await conn.execute(
                        "INSERT INTO board_speed_stats (speed_id, board_id, interface_name, download_mbps, upload_mbps, log_time) VALUES ($1, $2, $3, $4, $5, $6)",
                        speed_counter, bid, "ether1", dl, ul, sample_time
                    )
                    speed_counter += 1
                
                # --- Stage 1: Daily Usage & Summaries ---
                tx = random.randint(100, 1000) * 1024 * 1024 * 1024 # GB to bytes
                rx = random.randint(500, 5000) * 1024 * 1024 * 1024
                await conn.execute(
                    "INSERT INTO board_interface_usage (usage_id, board_id, interface_name, total_tx_bytes, total_rx_bytes, log_date) VALUES ($1, $2, $3, $4, $5, $6)",
                    usage_counter, bid, "ether1", tx, rx, log_date
                )
                usage_counter += 1
                
                # Daily Summary (Aggregated simulated)
                await conn.execute(
                    """INSERT INTO board_daily_summary 
                       (board_id, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, 
                        avg_cpu_load, max_cpu_load, avg_hotspot_users, avg_pppoe_users, log_date) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)""",
                    bid, 45.5, 98.2, rx, 10.2, 25.4, tx, 25, 85, 30, 15, log_date
                )
                
                # Random Events (occasional)
                if random.random() < 0.1: # 10% chance per day
                    await conn.execute(
                        "INSERT INTO board_events (event_id, board_id, event_category, event_level, event_name, event_detail, log_time) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                        event_counter, bid, "system", "warning", "High CPU Load", "CPU load exceeded 90% for 5 minutes", 
                        datetime.combine(log_date, datetime.min.time()) + timedelta(hours=random.randint(8, 20))
                    )
                    event_counter += 1

            if log_date.day == 1:
                print(f"Progress: Seeded up to {log_date}")
            
            current_time += timedelta(days=1)
            
        # 8. MONTHLY SUMMARIES (Last 12 months)
        print("Seeding monthly summaries...")
        for bid in board_ids:
            for i in range(12):
                month_date = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
                await conn.execute(
                    """INSERT INTO board_monthly_summary 
                       (board_id, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, log_month) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                       ON CONFLICT (board_id, log_month) DO NOTHING""",
                    bid, 40.0, 100.0, 1000*1024*1024*1024, 8.0, 30.0, 200*1024*1024*1024, month_date
                )
        
        # 9. HOTSPOT & PPPOE USAGE (Sample data for analysis)
        print("Seeding Hotspot & PPPOE usage samples...")
        for bid in board_ids:
            for i in range(20): # 20 users
                username = f"user_{i}@hotspot"
                for d in range(7): # 7 days
                    usage_date = today - timedelta(days=d)
                    dl_bytes = random.randint(100, 2000) * 1024 * 1024
                    ul_bytes = random.randint(50, 500) * 1024 * 1024
                    await conn.execute(
                        "INSERT INTO hotspot_usage_raw (raw_id, board_id, username, daily_download, daily_upload, daily_uptime, log_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                        usage_counter, bid, username, dl_bytes, ul_bytes, random.randint(3600, 28800), usage_date
                    )
                    usage_counter += 1
        
        # 10. AUTOMATION JOBS & LOGS
        print("Seeding automation jobs...")
        job_id = uuid.uuid4()
        await conn.execute(
            "INSERT INTO automation_jobs (job_id, job_type, payload, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6)",
            job_id, "mass_config", '{"script": "/system reboot"}', "Reboot all boards", "completed", admin_id
        )
        for bid in board_ids:
            await conn.execute(
                "INSERT INTO automation_logs (job_id, board_id, status, output) VALUES ($1, $2, $3, $4)",
                job_id, bid, "success", "Reboot command sent"
            )

        print("\n--- Seeding Completed Successfully ---")
        
        # VERIFICATION QUERY
        print("\n--- Data Verification ---")
        user_count = await conn.fetchval("SELECT COUNT(*) FROM master_users")
        board_count = await conn.fetchval("SELECT COUNT(*) FROM mikrotik_boards")
        stat_count = await conn.fetchval("SELECT COUNT(*) FROM board_client_stats")
        summary_count = await conn.fetchval("SELECT COUNT(*) FROM board_daily_summary")
        
        print(f"Total Users: {user_count}")
        print(f"Total Boards: {board_count}")
        print(f"Total Client Stats (1 Year): {stat_count}")
        print(f"Total Daily Summaries: {summary_count}")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
