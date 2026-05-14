import requests
import json

def test_api():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzI3OTIxMzcsInN1YiI6ImRldmVsb3BlciJ9.7ssBFd3J0-k2jPE9l2Ur4jOsj0XdCd_suzScJt-JzNo"
    board_id = "4918fdab-ee97-4eae-b8fe-f607794e22ce"
    
    endpoints = [
        f"api/v2/analysis/{board_id}/hotspot/top/?days=30&limit=5",
        f"api/v2/analysis/{board_id}/interfaces/top/?days=30&limit=5",
        f"api/v2/analysis/{board_id}/pppoe/top/?days=30&limit=5"
    ]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    for endpoint in endpoints:
        url = f"http://127.0.0.1:8000/{endpoint}"
        print(f"\nTesting: {url}")
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)

if __name__ == "__main__":
    test_api()
