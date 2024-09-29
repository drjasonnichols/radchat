import time
import requests

# URL of the route you want to call
url = 'https://radchat.apphangar.cloud/protected_task'

# Optional headers or data payload if needed for the route
headers = {
    'Content-Type': 'application/json'
}

# Function to call the endpoint
def call_protected_task():
    try:
        response = requests.post(url, headers=headers)
        if response.status_code == 200:
            print("Successfully called protected_task:", response.json())
        else:
            print(f"Failed with status code {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error calling protected_task: {e}")

# Run periodically, for example every 10 minutes
if __name__ == "__main__":
    while True:
        call_protected_task()
        time.sleep(10)  # Sleep for 10 minutes