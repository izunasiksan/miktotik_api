import asyncio
import asyncpg
import os
import json
from datetime import datetime

# ============================================================
# CONFIGURATION
# ============================================================
DB_URL = "postgresql://postgres:root@localhost:5432/db_master_mikrotik"
SNAPSHOT_DIR = "e:/mikrotik_api/docs/analisis_data_v2.4/snapshots"

# ============================================================
# UTILITIES
# ============================================================
async def take_snapshot(conn):
    """
    Simpan snapshot data lama (terutama master data) ke file JSON.
    """
    if not os.path.exists(SNAPSHOT_DIR):
        os.makedirs(SNAPSHOT_DIR)
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_file = os.path.join(SNAPSHOT_DIR, f"snapshot_{timestamp}.json")
    
    snapshot_data = {}
    tables_to_backup = ['master_roles', 'master_sites', 'master_board_models', 'master_users', 'mikrotik_boards']
    
    print(f"Taking snapshot of {len(tables_to_backup)} tables...")
    for table in tables_to_backup:
        try:
            rows = await conn.fetch(f"SELECT * FROM {table}")
            snapshot_data[table] = [dict(r) for r in rows]
        except Exception as e:
            print(f"  Warning: Could not snapshot table {table}: {e}")
            
    # Serialize UUIDs, datetimes, and IP addresses
    def serializer(obj):
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        if hasattr(obj, 'hex'):
            return str(obj)
        if hasattr(obj, 'packed'): # For ipaddress objects
            return str(obj)
        raise TypeError(f"Type {type(obj)} not serializable")
        
    with open(snapshot_file, 'w') as f:
        json.dump(snapshot_data, f, default=serializer, indent=2)
    
    print(f"Snapshot saved to: {snapshot_file}")

async def drop_partitions(conn):
    """
    Drop all dynamic partitions.
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
    
    print("Dropping partitions...")
    partitions = await conn.fetch("""
        SELECT nmsp_parent.nspname AS parent_schema,
               parent.relname      AS parent_table,
               nmsp_child.nspname  AS child_schema,
               child.relname       AS child_table
        FROM pg_inherits
        JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child             ON pg_inherits.inhrelid  = child.oid
        JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid       = parent.relnamespace
        JOIN pg_namespace nmsp_child    ON nmsp_child.oid        = child.relnamespace
        WHERE parent.relname = ANY($1)
    """, partitioned_tables)
    
    for p in partitions:
        await conn.execute(f"DROP TABLE IF EXISTS {p['child_table']} CASCADE")
        print(f"  Dropped partition {p['child_table']}")

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
# MAIN ROLLBACK LOGIC
# ============================================================
async def rollback_v241():
    conn = await asyncpg.connect(DB_URL)
    print("--- 🔄 Starting Rollback Version 2.4.1 ---")
    
    try:
        # STEP 1: SNAPSHOT
        await take_snapshot(conn)
        
        # STEP 2: TRUNCATE TABLES (REVERSE ORDER)
        print("STEP 2: Truncating tables in reverse order...")
        # Order: Summary -> Usage -> Stats -> Config -> Master
        tables_to_truncate = [
            'board_monthly_summary', 'board_interface_daily_summary', 'board_daily_summary',
            'hotspot_usage_monthly', 'hotspot_usage_raw', 'board_pppoe_usage', 'board_interface_usage',
            'board_events', 'board_speed_stats', 'board_resource_stats', 'board_client_stats',
            'audit_logs', 'ztp_queue', 'automation_logs', 'automation_jobs', 'board_backups',
            'telegram_recipients', 'telegram_bots', 'user_board_access', 'board_interface_configs',
            'vpn_profiles', 'board_credentials', 'mikrotik_boards', 'master_users',
            'master_board_models', 'master_sites', 'master_roles'
        ]
        
        for table in tables_to_truncate:
            try:
                await conn.execute(f"TRUNCATE {table} RESTART IDENTITY CASCADE")
                print(f"  Truncated {table}")
            except Exception as e:
                print(f"  Warning: Skipping {table} (not found or error): {e}")
        
        # STEP 3: PARTITIONS
        await drop_partitions(conn)
        
        # STEP 4: SEQUENCES
        print("STEP 4: Resetting sequences...")
        await reset_sequences(conn)
        
        print("\n--- ✅ Rollback Completed Successfully ---")
        
    except Exception as e:
        print(f"❌ Error during rollback: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(rollback_v241())
