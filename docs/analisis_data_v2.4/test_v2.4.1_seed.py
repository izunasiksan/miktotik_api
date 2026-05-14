import asyncio
import asyncpg
import time
import json
import uuid
from datetime import datetime, date
from seed_v2_4_1 import seed_v241
from rollback_v2_4_1 import rollback_v241

# ============================================================
# CONFIGURATION
# ============================================================
DB_URL = "postgresql://postgres:root@localhost:5432/db_master_mikrotik"

# ============================================================
# UNIT TESTS
# ============================================================
async def test_performance_seeding():
    print("--- 🚀 Testing Performance: Seeding (< 30s) ---")
    start_time = time.time()
    await seed_v241()
    end_time = time.time()
    duration = end_time - start_time
    print(f"Duration: {duration:.2f}s")
    assert duration < 30, f"Performance check failed! Seeded in {duration:.2f}s"
    print("[PASS] Performance check")

async def test_idempotency_seeding():
    print("--- 🚀 Testing Idempotency: Running seed twice ---")
    await seed_v241()
    await seed_v241()
    print("[PASS] Idempotency check")

async def test_rollback_mechanism():
    print("--- 🚀 Testing Rollback: Seed -> Rollback -> Verify Empty ---")
    await seed_v241()
    await rollback_v241()
    
    conn = await asyncpg.connect(DB_URL)
    tables = ['master_roles', 'master_users', 'mikrotik_boards']
    for table in tables:
        count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
        assert count == 0, f"Rollback failed! Table {table} still has {count} records."
    await conn.close()
    print("[PASS] Rollback check")

async def test_data_integrity_and_relations():
    print("--- 🚀 Testing Data Integrity and Relations (Join Queries) ---")
    await seed_v241()
    conn = await asyncpg.connect(DB_URL)
    
    # 1. User -> Role
    user_roles = await conn.fetch("""
        SELECT u.username, r.role_name 
        FROM master_users u 
        JOIN master_roles r ON u.role_id = r.role_id
    """)
    assert len(user_roles) > 0, "User-Role relation failed!"
    print(f"  Verified User-Role join: {len(user_roles)} users")
    
    # 2. Board -> Site & Model
    board_relations = await conn.fetch("""
        SELECT b.board_name, s.site_name, m.model_name 
        FROM mikrotik_boards b 
        JOIN master_sites s ON b.site_id = s.site_id 
        JOIN master_board_models m ON b.model_id = m.model_id
    """)
    assert len(board_relations) > 0, "Board-Site-Model relation failed!"
    print(f"  Verified Board-Site-Model join: {len(board_relations)} boards")
    
    # 3. Stats -> Board
    stats_count = await conn.fetchval("""
        SELECT COUNT(*) 
        FROM board_client_stats s 
        JOIN mikrotik_boards b ON s.board_id = b.board_id
    """)
    assert stats_count > 0, "Stats-Board relation failed!"
    print(f"  Verified Stats-Board join: {stats_count} records")
    
    # 4. FK Constraints Check
    try:
        # Try to delete a role that's in use
        role_id = await conn.fetchval("SELECT role_id FROM master_roles LIMIT 1")
        await conn.execute("DELETE FROM master_roles WHERE role_id = $1", role_id)
        assert False, "FK constraint (Role -> User) should have failed!"
    except asyncpg.exceptions.ForeignKeyViolationError:
        print("  Verified FK constraint: Cannot delete role in use.")
    
    await conn.close()
    print("[PASS] Data Integrity check")

async def run_all_tests():
    try:
        # Import as functions (assuming file names are same as functions for clarity)
        # Note: Need to adjust imports if file names are different
        from seed_v2_4_1 import seed_v241
        from rollback_v2_4_1 import rollback_v241
        
        await test_rollback_mechanism()
        await test_performance_seeding()
        await test_idempotency_seeding()
        await test_data_integrity_and_relations()
        
        print("\n--- ✅ ALL UNIT TESTS PASSED (100% SUCCESS) ---")
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        raise

if __name__ == "__main__":
    # Adjust imports if necessary for local execution
    import sys
    import os
    sys.path.append(os.getcwd())
    
    # Simple manual function binding if module name doesn't match
    import seed_v2_4_1
    import rollback_v2_4_1
    globals()['seed_v241'] = seed_v2_4_1.seed_v241
    globals()['rollback_v241'] = rollback_v2_4_1.rollback_v241
    
    asyncio.run(run_all_tests())
