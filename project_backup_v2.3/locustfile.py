from locust import HttpUser, task, between

class MikrotikUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """Login to get the token"""
        response = self.client.post("/api/v1/auth/login", data={"username": "stress_test", "password": "password"})
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            print("Login successful")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")

    @task(3)
    def dashboard_summary(self):
        if self.token:
            self.client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {self.token}"})

    @task(2)
    def list_boards(self):
        if self.token:
            self.client.get("/api/v1/mikrotik/boards", headers={"Authorization": f"Bearer {self.token}"})
    
    @task(1)
    def list_users(self):
        if self.token:
            self.client.get("/api/v1/users", headers={"Authorization": f"Bearer {self.token}"})

