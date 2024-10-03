const ChatSocket = {
    socket: null,
    maxRetries: 3,  // Maximum number of retry attempts for connection
    retryDelay: 300, // Delay between retries in milliseconds
    currentRetries: 0,  // Tracks current number of connection retries
    jwtToken: localStorage.getItem('jwtToken'),  // Retrieves JWT token from local storage
    refreshChattersCallback: null, // Callback function to update the list of chatters
    refreshRobotsCallback: null, // Callback function to refresh the robot users list
    messageCallback: null, // Callback function to handle new messages
    lastSentMessage: null,  // Stores the last message sent (used for retry logic)
    users: [], // Array to hold the current list of users
    userCount: 0, // Total number of users connected

    /**
     * Establishes a connection to the WebSocket server using Socket.IO
     * If a JWT token is missing, it logs an error and exits the function.
     * Handles events like connect, broadcast messages, disconnect, and errors.
     */
    connect: function () {
        if (!this.jwtToken) {
            console.error("No JWT token found. Cannot connect to WebSocket.");
            return;
        }

        // Establish SocketIO connection using WebSocket and polling transports
        this.socket = io.connect(`${window.location.protocol}//${window.location.host}`, {
            transports: ['websocket', 'polling'],    
            query: `token=${this.jwtToken}`
        });

        // Handle successful connection
        this.socket.on('connect', () => {
            console.log('SocketIO connection established.');
            console.log('Socket ID:', this.socket.id);  // Log unique socket connection ID
            console.log('Socket connected:', this.socket.connected);  // Confirm connection is open
            console.log('Socket URL:', this.socket.io.uri);  // Log the server URL
            console.log('Socket transport:', this.socket.io.engine.transport.name);  // Log current transport method (e.g., websocket)
            this.currentRetries = 0;  // Reset retry counter after a successful connection
        });

        this.socket.on('system_message', (data) => {
            console.log("Received system message:", data);
            if (data.event === 'refresh_robots') {
                if (this.refreshRobotsCallback) {
                    this.refreshRobotsCallback();  // Trigger the robot refresh callback
                }
            }

        });
        
        /**
         * Listens for incoming messages via 'broadcast_message' event.
         * Updates the list of users, handles robot events, and triggers message or user list refresh callbacks.
         */
        this.socket.on('broadcast_message', (data) => {
            console.log("Received message:", data);

            // Handle invalid token error and potential retry mechanism
            if (data.error && data.error.includes('Invalid token')) {
                console.error("Invalid token detected. Retrying message...");
                // Retry logic can be placed here
            } else {
                if (this.messageCallback) {
                    this.messageCallback(data);  // Trigger the message callback if it exists
                }
            }

            // Update the list of chatters based on events like adding or removing users
            if (data.event === 'new_chatter') {
                this.users.unshift(data.user);  // Add new chatter to the beginning of the list
                if (data.user_count) {
                    this.userCount = parseInt(data.user_count);  // Update user count
                }
            } else if (data.event === 'remove_chatter') {
                const index = this.users.indexOf(data.user);
                if (index !== -1) {
                    this.users.splice(index, 1);  // Remove chatter from the list
                    if (data.user_count) {
                        this.userCount = parseInt(data.user_count) - 1;  // Update user count
                    }
                }
            } else if (data.event === 'refresh_robots') {
                if (this.refreshRobotsCallback) {
                    this.refreshRobotsCallback();  // Trigger the robot refresh callback
                }
            } else if (data.user) {
                if (!this.users.includes(data.user)) {
                    this.users.unshift(data.user);  // Add user if they don't exist in the list
                    if (data.user_count) {
                        this.userCount = parseInt(data.user_count);  // Update user count
                    }
                }
            }

            if (this.refreshChattersCallback) {
                this.refreshChattersCallback(this.users, this.userCount - this.users.length);  // Refresh chatters list via callback
            }
        });

        // Handle Socket.IO disconnection
        this.socket.on('disconnect', (reason) => {
            console.log("SocketIO disconnected:", reason);
            // Retry connection logic can be added here
        });

        // Handle Socket.IO connection errors
        this.socket.on('connect_error', (error) => {
            console.error("SocketIO error:", error);
            // Retry connection logic can be added here
        });

        // Log a successful connection event
        this.socket.on('connect_success', (data) => {
            console.log('Connection successful:', data.message);
        });
    },

    /**
     * Disconnects the active Socket.IO connection if it exists.
     * Logs a message if there's no active connection to disconnect.
     */
    disconnect: function () {
        if (this.socket) {
            this.socket.disconnect();  // Close the socket connection
            console.log("Disconnected from SocketIO.");
        } else {
            console.log("No active SocketIO connection.");
        }
    },

    /**
     * Sends a message through the Socket.IO connection.
     * If the connection is open, the message is sent and stored for potential retry in case of failure.
     */
    sendMessage: function (message) {
        if (this.socket && this.socket.connected) {
            this.lastSentMessage = message;  // Store the message in case it needs to be resent

            this.socket.emit('send_message', { message: message, token: this.jwtToken }, (response) => {
                if (response && response.error) {
                    console.error('Server error on emit:', response.error);  // Log server errors if any
                } else {
                    console.log('Message sent successfully:', this.lastSentMessage);  // Confirm message was sent
                }
            });
        } else {
            console.error("SocketIO connection is not open. Cannot send message.");  // Log if no connection is open
        }
    },

    /**
     * Attempts to resend the last sent message after refreshing the JWT token.
     * If no last message exists or token is unavailable, logs an error.
     */
    retrySendMessage: function () {
        console.log("Retrying last message with refreshed token...");

        // Refresh the JWT token (assuming refreshJwtToken logic is implemented)
        this.jwtToken = this.refreshJwtToken();

        if (this.lastSentMessage && this.jwtToken) {
            // Resend the last message if available
            this.sendMessage(this.lastSentMessage);
        } else {
            console.error("No message to retry or token unavailable.");  // Log if no message or token is available
        }
    },

    /**
     * Placeholder function to refresh the JWT token.
     * You can replace this with actual logic to obtain a new token, such as an API call.
     */
    refreshJwtToken: function () {
        console.log("Refreshing JWT token...");
        return localStorage.getItem('newJwtToken');  // Simulate token refresh from localStorage (replace with real logic)
    },

    /**
     * Retries connecting to the WebSocket server.
     * Retries are limited to a maximum number (`maxRetries`) with a delay between attempts.
     */
    retryConnection: function () {
        if (this.currentRetries < this.maxRetries) {
            this.currentRetries++;
            console.log(`Retrying connection... (${this.currentRetries}/${this.maxRetries})`);

            setTimeout(() => {
                this.connect();  // Attempt to reconnect after the specified delay
            }, this.retryDelay);
        } else {
            console.error("Max retries reached. Could not reconnect to SocketIO.");  // Log if retry limit is reached
        }
    },

    /**
     * Sets a callback function to refresh the list of chatters.
     * This function is triggered when the list of chatters needs to be updated.
     */
    setRefreshChattersCallback: function (callback) {
        this.refreshChattersCallback = callback;
    },

    /**
     * Sets a callback function to handle incoming messages.
     * This function is triggered whenever a new message is received.
     */
    setMessageCallback: function (callback) {
        this.messageCallback = callback;
    },

    /**
     * Sets a callback function to refresh the list of robots.
     * This function is triggered when the list of robots needs to be updated.
     */
    setRefreshRobotsCallback: function (callback) {
        this.refreshRobotsCallback = callback;
    }
};