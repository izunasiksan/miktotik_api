import asyncio
import asyncpg
import uuid
import random
from datetime import datetime, timedelta, date
from faker import Faker
from passlib.hash import argon2

# Configuration
DB_URL = "postgresql://postgres:root@localhost:5432/db_master_mikrotik"
NUM_BOARDS = 5
NUM_USERS = 7
DAYS_OF_HISTORY = 365  # 1 Year of historical data
fake = Faker()

# Password hashing
def hash_password(password: str) -> str:
    return argon2.hash(password)

async def create_partitions(conn, start_date: date, end_date: date):
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
                await conn.execute(f"CREATE TABLE IF NOT EXISTS {partition_name} PARTITION OF {table} FOR VALUES FROM ('{start_str}') TO ('{end_str}')")
        current = next_month

async def seed_data():
    conn = await asyncpg.connect(DB_URL)
    print("--- Connected to Database ---")
    
    try:
        # 1. TRUNCATE ALL DATA
        print("Truncating existing data...")
        await conn.execute("TRUNCATE master_users, mikrotik_boards, telegram_bots, automation_jobs, ztp_queue, master_roles, master_sites, master_board_models RESTART IDENTITY CASCADE")
        
        # 2. SEED MASTER ROLES (V2.4 3NF)
        print("Seeding master roles...")
        roles_data = [('admin', '[]'), ('teknisi', '[]'), ('viewer', '[]')]
        role_map = {}
        for r_name, r_perms in roles_data:
            r_id = await conn.fetchval("INSERT INTO master_roles (role_name, permissions) VALUES ($1, $2) RETURNING role_id", r_name, r_perms)
            role_map[r_name] = r_id

        # 3. SEED MASTER SITES (V2.4 3NF)
        print("Seeding master sites...")
        sites = ["Jakarta-Pusat", "Bandung-Dago", "Surabaya-Gubeng", "Medan-Kota", "Makassar-Panakkukang"]
        site_map = {}
        for s_name in sites:
            s_id = await conn.fetchval("INSERT INTO master_sites (site_name) VALUES ($1) RETURNING site_id", s_name)
            site_map[s_name] = s_id

        # 4. SEED MASTER BOARD MODELS (V2.4 3NF)
        print("Seeding master board models...")
        models = ["RB4011iGS+5HacQ2nD-IN", "CCR1009-7G-1C-1S+", "hEX lite", "RB750Gr3", "CCR2004-16G-2S+"]
        model_map = {}
        for m_name in models:
            m_id = await conn.fetchval("INSERT INTO master_board_models (model_name) VALUES ($1) RETURNING model_id", m_name)
            model_map[m_name] = m_id

        # 5. CREATE PARTITIONS
        today = date.today()
        start_history = today - timedelta(days=DAYS_OF_HISTORY)
        print(f"Generating partitions for the last {DAYS_OF_HISTORY} days...")
        await create_partitions(conn, start_history, today + timedelta(days=31))
        
        # 6. SEED MASTER USERS
        print(f"Seeding {NUM_USERS} users...")
        user_ids = []
        
        # Admin
        admin_uid = uuid.uuid4()
        await conn.execute(
            "INSERT INTO master_users (user_id, username, password_hash, full_name, role, role_id) VALUES ($1, $2, $3, $4, $5, $6)",
            admin_uid, "admin", hash_password("admin123"), "System Administrator", "admin", role_map['admin']
        )
        user_ids.append(admin_uid)
        
        # Developer
        dev_uid = uuid.uuid4()
        await conn.execute(
            "INSERT INTO master_users (user_id, username, password_hash, full_name, role, role_id) VALUES ($1, $2, $3, $4, $5, $6)",
            dev_uid, "developer", hash_password("developer123"), "Developer Admin", "admin", role_map['admin']
        )
        user_ids.append(dev_uid)
        
        for i in range(NUM_USERS - 2):
            uid = uuid.uuid4()
            r_name = 'teknisi' if i < 4 else 'viewer'
            await conn.execute(
                "INSERT INTO master_users (user_id, username, password_hash, full_name, role, role_id) VALUES ($1, $2, $3, $4, $5, $6)",
                uid, fake.user_name(), hash_password("pass123"), fake.name(), r_name, role_map[r_name]
            )
            user_ids.append(uid)
            
        # 7. SEED MIKROTIK BOARDS
        print(f"Seeding {NUM_BOARDS} boards...")
        board_ids = []
        for i in range(NUM_BOARDS):
            bid = uuid.uuid4()
            s_name = sites[i]
            m_name = models[i]
            await conn.execute(
                """INSERT INTO mikrotik_boards 
                   (board_id, board_name, mikrotik_identity, board_model, site_group, site_id, model_id, mac_address, ip_address, is_online) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
                bid, f"Router-{s_name}", f"Mikrotik-{s_name}", m_name, s_name, site_map[s_name], model_map[m_name],
                fake.mac_address(), f"192.168.{i+10}.1", True
            )
            board_ids.append(bid)
            
            await conn.execute("INSERT INTO board_credentials (board_id, username_mikrotik, password_mikrotik_encrypted) VALUES ($1, $2, $3)", bid, "admin", "ENCRYPTED_DUMMY_PWD")
            await conn.execute("INSERT INTO vpn_profiles (board_id, vpn_type, vpn_api, vpn_username, vpn_password_encrypted, is_connected) VALUES ($1, $2, $3, $4, $5, $6)", bid, "L2TP/IPSEC", f"vpn-{i+1}.example.com", f"vpn_user_{i}", "ENCRYPTED_VPN_PWD", True)
            await conn.execute("INSERT INTO board_interface_configs (board_id, interface_name, interface_label, is_primary_uplink) VALUES ($1, $2, $3, $4)", bid, "ether1", "Uplink ISP", True)
            await conn.execute("INSERT INTO board_interface_configs (board_id, interface_name, interface_label, is_primary_uplink) VALUES ($1, $2, $3, $4)", bid, "bridge-local", "Local Network", False)
            
        # 8. USER BOARD ACCESS
        print("Seeding user board access...")
        for uid in user_ids:
            for bid in board_ids:
                await conn.execute("INSERT INTO user_board_access (user_id, board_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", uid, bid)
                
        # 9. TELEGRAM BOTS
        print("Seeding telegram bots...")
        await conn.execute("INSERT INTO telegram_bots (bot_name, bot_token) VALUES ($1, $2)", "MikrotikMonitorBot", "123456789:ABCDEF-GHIJKL")
        
        # 10. HISTORICAL DATA (CHUNKS)
        print(f"Generating historical data for {NUM_BOARDS} boards over {DAYS_OF_HISTORY} days...")
        current_time = datetime.now() - timedelta(days=DAYS_OF_HISTORY)
        end_time = datetime.now()
        
        while current_time <= end_time:
            log_date = current_time.date()
            for bid in board_ids:
                for hour in [0, 6, 12, 18]:
                    sample_time = datetime.combine(log_date, datetime.min.time()) + timedelta(hours=hour)
                    if sample_time > end_time: continue
                    await conn.execute("INSERT INTO board_client_stats (board_id, total_hotspot, total_pppoe, log_time, accuracy_pct) VALUES ($1, $2, $3, $4, $5)", bid, random.randint(10, 50), random.randint(5, 30), sample_time, 100.0)
                    await conn.execute("INSERT INTO board_resource_stats (board_id, cpu_load, free_memory, free_hdd, log_time, accuracy_pct) VALUES ($1, $2, $3, $4, $5, $6)", bid, random.randint(5, 60), random.randint(100, 512)*1024*1024, 1024*1024*1024, sample_time, 100.0)
                    await conn.execute("INSERT INTO board_speed_stats (board_id, interface_name, download_mbps, upload_mbps, log_time, accuracy_pct) VALUES ($1, $2, $3, $4, $5, $6)", bid, "ether1", round(random.uniform(5.0, 95.0), 2), round(random.uniform(1.0, 20.0), 2), sample_time, 100.0)
                
                tx, rx = random.randint(100, 1000)*1024*1024*1024, random.randint(500, 5000)*1024*1024*1024
                await conn.execute("INSERT INTO board_interface_usage (board_id, interface_name, total_tx_bytes, total_rx_bytes, log_date) VALUES ($1, $2, $3, $4, $5)", bid, "ether1", tx, rx, log_date)
                await conn.execute("INSERT INTO board_daily_summary (board_id, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, avg_cpu_load, max_cpu_load, avg_hotspot_users, avg_pppoe_users, log_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)", bid, 45.5, 98.2, rx, 10.2, 25.4, tx, 25, 85, 30, 15, log_date)
            current_time += timedelta(days=1)
            
        print("\n--- Seeding Completed Successfully ---")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
