from locust import HttpUser, task, between
import os
import random

# Ambil token dari environment atau hardcode untuk testing
# Sebaiknya gunakan user khusus load test
API_TOKEN = os.getenv("LOAD_TEST_TOKEN", "YOUR_JWT_TOKEN_HERE")

class MikrotikApiUser(HttpUser):
    wait_time = between(1, 3)
    board_ids = []

    def on_start(self):
        """
        Login simulation if needed, or set headers.
        Here we assume Bearer token is provided via Env Var.
        """
        self.client.headers.update({"Authorization": f"Bearer {API_TOKEN}"})
        
        # Fetch list of boards to use in tests
        try:
            response = self.client.get("/api/v1/boards?limit=100")
            if response.status_code == 200:
                boards = response.json()
                self.board_ids = [b['board_id'] for b in boards]
                print(f"Loaded {len(self.board_ids)} boards for testing.")
            else:
                print(f"Failed to load boards: {response.status_code}")
        except Exception as e:
            print(f"Error loading boards: {e}")

    @task(3)
    def get_boards_list(self):
        self.client.get("/api/v1/boards")

    @task(5)
    def get_board_stats(self):
        if not self.board_ids:
            return
        
        board_id = random.choice(self.board_ids)
        self.client.get(f"/api/v1/boards/{board_id}/stats")

    @task(1)
    def get_board_events(self):
        if not self.board_ids:
            return
        
        board_id = random.choice(self.board_ids)
        self.client.get(f"/api/v1/boards/{board_id}/events?limit=20")

    @task(2)
    def get_daily_report(self):
        if not self.board_ids:
            return
        
        board_id = random.choice(self.board_ids)
        self.client.get(f"/api/v1/reports/daily/{board_id}?limit=7")
