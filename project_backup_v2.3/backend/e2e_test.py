import asyncio
import httpx
import uuid

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "developer"
PASSWORD = "developer123"

async def run_e2e_test():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        print("--- 1. Login ---")
        # 1. Login
        login_data = {"username": USERNAME, "password": PASSWORD}
        # Note: Using form-urlencoded as fixed previously
        response = await client.post(f"{BASE_URL}/auth/login/", data=login_data)
        if response.status_code != 200:
            print(f"❌ Login Failed: {response.status_code} {response.text}")
            return
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login Success")

        print("\n--- 2. Board Management (CRUD) ---")
        # 2. Create Board (Negative Test - Missing MAC)
        board_data_invalid = {
            "board_name": "Test Router Invalid",
            "ip_address": "192.168.88.1",
            "username": "admin",
            "password": "password"
        }
        res = await client.post(f"{BASE_URL}/boards/", json=board_data_invalid, headers=headers)
        if res.status_code == 422:
            print("✅ Correctly rejected board without MAC address")
        else:
            print(f"❌ Should have rejected board without MAC. Status: {res.status_code}")

        # 3. Create Board (Positive Test)
        board_data = {
            "board_name": "E2E Test Router",
            "ip_address": "192.168.88.1",
            "mac_address": "00:00:00:00:00:01", # Required by schema
            "username": "admin",
            "password": "password",
            "port_api": 8728,
            "site_group": "Lab"
        }
        res = await client.post(f"{BASE_URL}/boards/", json=board_data, headers=headers)
        if res.status_code in [200, 201]:
            board = res.json()
            board_id = board["board_id"]
            print(f"✅ Board Created: {board_id}")
        else:
            print(f"❌ Failed to create board: {res.text}")
            return

        # 4. VPN Profile
        print("\n--- 3. VPN Profile ---")
        vpn_data = {
            "vpn_type": "L2TP/IPSEC",
            "vpn_username": "vpnuser",
            "vpn_password": "vpnpassword",
            "vpn_api": "192.168.88.1",
            "is_connected": False
        }
        # Assuming endpoint is /boards/{id}/vpn/ or similar based on audit
        # Let's try /boards/{id}/vpn-profiles/ based on typical REST or check docs
        # Audit said: "Manajemen profil VPN per router" in boards.py
        res = await client.post(f"{BASE_URL}/boards/{board_id}/vpn/", json=vpn_data, headers=headers) 
        if res.status_code in [200, 201]:
             print("✅ VPN Profile Added")
        else:
             print(f"❌ Failed to add VPN Profile: {res.status_code} {res.text}")


        print("\n--- 4. Automation ---")
        # 5. Check Automation Jobs (Audit said endpoint might be missing)
        res = await client.get(f"{BASE_URL}/automation/jobs/", headers=headers)
        if res.status_code == 200:
            print("✅ Automation Jobs Endpoint exists")
        else:
            print(f"❌ Automation Jobs Endpoint missing or error: {res.status_code}")

        # 6. Mass Config (Simulate)
        mass_config_data = {
            "board_ids": [board_id],
            "command": "/system identity set name=TestRouter",
            "description": "E2E Test Config"
        }
        res = await client.post(f"{BASE_URL}/automation/mass-config/", json=mass_config_data, headers=headers)
        if res.status_code in [200, 201]:
            print("✅ Mass Config Job Submitted")
        else:
            print(f"❌ Mass Config Job Failed: {res.text}")

        print("\n--- 5. Dashboard & Stats ---")
        # 7. Dashboard Summary
        res = await client.get(f"{BASE_URL}/dashboard/summary/", headers=headers)
        if res.status_code == 200:
             print("✅ Dashboard Summary: OK")
        else:
             print(f"❌ Dashboard Summary Failed: {res.status_code}")

        # 8. Board Stats (Resource)
        # Note: /boards/{id}/stats/ might return empty if no polling happened yet, but should not 500
        print(f"   [MONITOR] Checking stats for board {board_id}...")
        res = await client.get(f"{BASE_URL}/boards/{board_id}/stats/", headers=headers)
        if res.status_code == 200:
             stats = res.json()
             if isinstance(stats, list):
                 if not stats:
                     print("⚠️ Board Stats (Monitor): OK but empty list (No polling data yet)")
                 else:
                     latest_stat = stats[0] 
                     if all(k in latest_stat for k in ["cpu_load", "free_memory", "uptime"]):
                         print("✅ Board Stats (Monitor): OK - Contains expected metrics")
                     else:
                         print(f"⚠️ Board Stats (Monitor): OK but missing keys in list item. Got: {list(latest_stat.keys())}")
             elif isinstance(stats, dict):
                 if all(k in stats for k in ["cpu_load", "free_memory", "uptime"]):
                     print("✅ Board Stats (Monitor): OK - Contains expected metrics")
                 else:
                     print(f"⚠️ Board Stats (Monitor): OK but missing keys. Got: {list(stats.keys())}")
             else:
                 print(f"⚠️ Board Stats (Monitor): Unexpected type {type(stats)}")
        else:
             print(f"❌ Board Stats Failed: {res.status_code} {res.text}")
        
        # 9. Reports Daily
        res = await client.get(f"{BASE_URL}/reports/daily/{board_id}/", headers=headers)
        if res.status_code == 200:
             print("✅ Daily Reports: OK")
        else:
             print(f"❌ Daily Reports Failed: {res.status_code} {res.text}")

        print("\n--- 7. Analysis ---")
        res = await client.get(f"{BASE_URL}/analysis/{board_id}/summary/", headers=headers)
        if res.status_code == 200:
            print("✅ Analysis Summary: OK")
        else:
            print(f"❌ Analysis Summary Failed: {res.status_code} {res.text}")

        res = await client.get(f"{BASE_URL}/analysis/{board_id}/heavy/?days=7&granularity=day", headers=headers)
        if res.status_code == 200:
            print("✅ Analysis Heavy: OK")
        else:
            print(f"❌ Analysis Heavy Failed: {res.status_code} {res.text}")

        print("\n--- 6. Cleanup ---")
        # 10. Delete Board
        res = await client.delete(f"{BASE_URL}/boards/{board_id}/", headers=headers)
        if res.status_code == 200:
            print("✅ Board Deleted")
        else:
            print(f"❌ Failed to delete board: {res.text}")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
