import time
import requests
import logging

# Set up logging to output to the console with a detailed format
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

# URL of the route you want to call
url = 'https://radchat.apphangar.cloud/protected_task'

# Optional headers or data payload if needed for the route
headers = {
    'Content-Type': 'application/json'
}

# Function to call the endpoint
def call_protected_task():
    try:
        logging.info("Calling protected_task endpoint.")
        response = requests.post(url, headers=headers)
        if response.status_code == 200:
            logging.info(f"Successfully called protected_task: {response.json()}")
        else:
            logging.error(f"Failed with status code {response.status_code}: {response.text}")
    except Exception as e:
        logging.exception(f"Error calling protected_task: {e}")

# Run periodically, every 10 seconds for this example
if __name__ == "__main__":
    logging.info("Worker started.")
    while True:
        call_protected_task()
        logging.info("Sleeping for 10 seconds before the next call.")
        time.sleep(10)  # Sleep for 10 seconds