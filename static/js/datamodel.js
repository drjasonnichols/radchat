// datamodel.js

const DataModel = {
    baseUrl: `${window.location.protocol}//${window.location.host}/`,  // Base URL dynamically generated for API requests

    /**
     * Helper function for making authenticated API requests with retries.
     * This function sends a request to the given URL using the provided options.
     * It automatically adds the Authorization header with the JWT token from local storage.
     * If the request fails, it retries up to 3 times before throwing an error.
     *
     * @param {string} url - The API endpoint to send the request to.
     * @param {object} options - Optional fetch options (e.g., method, headers).
     * @returns {Promise<object>} - The JSON response from the API.
     */
    async fetchWithAuth(url, options = {}) {
        const headers = {
            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,  // Add JWT token for authentication
            'Content-Type': 'application/json',  // Ensure the request sends and receives JSON
        };
        options.headers = headers;

        // Retry logic: attempt the request up to 3 times
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(url, options);  // Send the request using fetch
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);  // Throw an error if response is not OK
                }
                return await response.json();  // Parse and return the response JSON if successful
            } catch (error) {
                if (attempt === 3) {
                    // If this is the third and final attempt, rethrow the error
                    throw error;
                }
                // Optional: add a short delay (e.g., 200ms) before retrying
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    },

    /**
     * Fetches all RoboChatters from the API.
     * This method sends a GET request to the 'robochatters' endpoint to retrieve the list of RoboChatters.
     *
     * @returns {Promise<Array>} - The list of RoboChatters.
     */
    async getAllRoboChatters() {
        const url = this.baseUrl + 'robochatters';  // Construct the full API URL
        try {
            const robochatters = await this.fetchWithAuth(url, { method: 'GET' });  // Send GET request to fetch RoboChatters
            return robochatters;  // Return the list of RoboChatters
        } catch (error) {
            console.error('Error fetching RoboChatters:', error);  // Log any errors that occur
            throw error;  // Rethrow the error so it can be handled elsewhere
        }
    },

    /**
     * Toggles the enabled status of a specific RoboChatter by its ID.
     * This method sends a POST request to the 'robochatter/toggle' endpoint to switch the status (enabled/disabled).
     *
     * @param {number} robochatterId - The ID of the RoboChatter to toggle.
     * @returns {Promise<object>} - The updated RoboChatter object.
     */
    async toggleRoboChatter(robochatterId) {
        const url = this.baseUrl + `robochatter/toggle/${robochatterId}`;  // Construct the full API URL with RoboChatter ID
        try {
            const updatedRoboChatter = await this.fetchWithAuth(url, { method: 'POST' });  // Send POST request to toggle status
            return updatedRoboChatter;  // Return the updated RoboChatter object
        } catch (error) {
            console.error(`Error toggling RoboChatter with ID ${robochatterId}:`, error);  // Log any errors that occur
            throw error;  // Rethrow the error so it can be handled elsewhere
        }
    }

};

