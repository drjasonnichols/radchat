const ChatSocket = {
    socket: null,
    maxRetries: 3,
    retryDelay: 300,
    currentRetries: 0,
    jwtToken: localStorage.getItem('jwtToken'),
    refreshChattersCallback: null,
    refreshRobotsCallback: null,
    messageCallback: null,
    typingIndicatorCallback: null, // Callback to update typing indicator
    lastSentMessage: null,
    users: [],
    userCount: 0,
    userTypingTimeout: null,
    robotTypingTimeout: null,
    userTyping: false,
    robotTyping: false,

    connect: function () {
        if (!this.jwtToken) {
            console.error("No JWT token found. Cannot connect to WebSocket.");
            return;
        }

        this.socket = io.connect(`${window.location.protocol}//${window.location.host}`, {
            transports: ['websocket', 'polling'],
            query: `token=${this.jwtToken}`
        });

        this.socket.on('connect', () => {
            console.log('SocketIO connection established.');
            this.currentRetries = 0;
        });

        this.socket.on('system_message', (data) => {
            if (data.event === 'refresh_robots') {
                if (this.refreshRobotsCallback) {
                    this.refreshRobotsCallback();
                }
            }
        });

        this.socket.on('broadcast_message', (data) => {
            if (this.messageCallback) {
                this.messageCallback(data);
            }

            if (data.event === 'new_chatter') {
                this.users.unshift(data.user);
                this.userCount = parseInt(data.user_count);
            } else if (data.event === 'remove_chatter') {
                const index = this.users.indexOf(data.user);
                if (index !== -1) {
                    this.users.splice(index, 1);
                    this.userCount = parseInt(data.user_count) - 1;
                }
            } else if (data.event === 'refresh_robots') {
                if (this.refreshRobotsCallback) {
                    this.refreshRobotsCallback();
                }
            }
        });

        // Listen for typing event
        this.socket.on('typing_event', (data) => {
            if (data.type === 'user') {
                this.handleUserTyping(data.duration);
            } else if (data.type === 'robot') {
                this.handleRobotTyping();
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log("SocketIO disconnected:", reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error("SocketIO error:", error);
        });

        this.socket.on('connect_success', (data) => {
            console.log('Connection successful:', data.message);
        });
    },

    // Emit typing event (for users)
    emitTypingEvent: function () {
        if (this.socket && this.socket.connected) {
            this.socket.emit('typing_event', { type: 'user', duration: 3 });
        }
    },

    // Handle user typing timeout and UI update
    handleUserTyping: function (duration) {
        clearTimeout(this.userTypingTimeout);
        this.userTyping = true;
        this.triggerTypingIndicatorCallback();

        this.userTypingTimeout = setTimeout(() => {
            this.userTyping = false;
            this.triggerTypingIndicatorCallback();
        }, duration * 1000);
    },

    // Handle robot typing
    handleRobotTyping: function () {
        clearTimeout(this.robotTypingTimeout);
        this.robotTyping = true;
        this.triggerTypingIndicatorCallback();

        this.robotTypingTimeout = setTimeout(() => {
            this.robotTyping = false;
            this.triggerTypingIndicatorCallback();
        }, 3000); // You can adjust this duration as needed
    },

    // Trigger the typing indicator callback based on the typing flags
    triggerTypingIndicatorCallback: function () {
        if (this.typingIndicatorCallback) {
            this.typingIndicatorCallback(this.userTyping, this.robotTyping);
        }
    },

    // Set the typing indicator callback
    setTypingIndicatorCallback: function (callback) {
        this.typingIndicatorCallback = callback;
    },

    disconnect: function () {
        if (this.socket) {
            this.socket.disconnect();
            console.log("Disconnected from SocketIO.");
        } else {
            console.log("No active SocketIO connection.");
        }
    },

    sendMessage: function (message) {
        if (this.socket && this.socket.connected) {
            this.lastSentMessage = message;
            this.socket.emit('send_message', { message: message, token: this.jwtToken }, (response) => {
                if (response && response.error) {
                    console.error('Server error on emit:', response.error);
                } else {
                    console.log('Message sent successfully:', this.lastSentMessage);
                }
            });
        } else {
            console.error("SocketIO connection is not open. Cannot send message.");
        }
    },

    retrySendMessage: function () {
        console.log("Retrying last message with refreshed token...");
        this.jwtToken = this.refreshJwtToken();

        if (this.lastSentMessage && this.jwtToken) {
            this.sendMessage(this.lastSentMessage);
        } else {
            console.error("No message to retry or token unavailable.");
        }
    },

    refreshJwtToken: function () {
        return localStorage.getItem('newJwtToken');
    },

    retryConnection: function () {
        if (this.currentRetries < this.maxRetries) {
            this.currentRetries++;
            setTimeout(() => {
                this.connect();
            }, this.retryDelay);
        } else {
            console.error("Max retries reached. Could not reconnect to SocketIO.");
        }
    },

    setRefreshChattersCallback: function (callback) {
        this.refreshChattersCallback = callback;
    },

    setMessageCallback: function (callback) {
        this.messageCallback = callback;
    },

    setRefreshRobotsCallback: function (callback) {
        this.refreshRobotsCallback = callback;
    }
};