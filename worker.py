import time
import requests
import logging
import random

# Set up logging to output to the console with a detailed format
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

# URLs of the routes you want to call
task_url = 'https://radchat.apphangar.cloud/protected_task'
notify_url = 'https://radchat.apphangar.cloud/protected_notify'  # Notify URL

# Optional headers or data payload if needed for the routes
headers = {
    'Content-Type': 'application/json'
}

# Function to call the protected_task endpoint
def call_protected_task():
    try:
        logging.info("Calling protected_task endpoint.")
        response = requests.post(task_url, headers=headers)
        if response.status_code == 200:
            logging.info(f"Successfully called protected_task: {response.json()}")
        else:
            logging.error(f"Failed with status code {response.status_code}: {response.text}")
    except Exception as e:
        logging.exception(f"Error calling protected_task: {e}")

# Function to call the protected_notify endpoint for robot typing notification
def call_protected_notify(duration):
    try:
        logging.info(f"Calling protected_notify endpoint with duration {duration} seconds.")
        payload = {'duration': duration}  # JSON payload for notify
        response = requests.post(notify_url, headers=headers, json=payload)
        if response.status_code == 200:
            logging.info(f"Successfully called protected_notify: {response.json()}")
        else:
            logging.error(f"Failed with status code {response.status_code}: {response.text}")
    except Exception as e:
        logging.exception(f"Error calling protected_notify: {e}")

# Run periodically
if __name__ == "__main__":
    logging.info("Worker started.")
    while True:
        call_protected_task()

        # Set the mean and standard deviation
        mean_sleep_time = 30  # Mean of 30 seconds
        std_dev_sleep_time = 5  # Standard deviation (you can adjust this)

        # Generate a sleep time from a normal distribution
        sleep_time = random.normalvariate(mean_sleep_time, std_dev_sleep_time)

        # Ensure that the sleep time is positive
        sleep_time = max(0, sleep_time)
        sleep_time = 32
        logging.info(f"Sleeping for {sleep_time:.2f} seconds before the next call.")

        # Call the protected_notify halfway through the sleep duration
        halfway_sleep_time = sleep_time / 2
        time.sleep(halfway_sleep_time)  # Sleep for half the time

        # Call the notify endpoint with the remaining duration
        remaining_duration = sleep_time - halfway_sleep_time
        call_protected_notify(remaining_duration)  # Notify that a robot is typing

        # Sleep for the remaining duration
        time.sleep(remaining_duration)