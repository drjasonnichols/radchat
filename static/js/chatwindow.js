// Function to handle sending the chat message
// This function sends a chat message if the text is not empty.
// It uses the ChatSocket object to emit the message.
function sendChat(text) {
    if (text.trim() === "") {
        console.error("Cannot send an empty message.");  // Log error if message is empty
        return;
    }
    ChatSocket.sendMessage(text);  // Send the message using ChatSocket
}

// Function to display RoboChatters
// Fetches the RoboChatters from the server and renders them in two containers (main and offcanvas).
// Each RoboChatter is displayed with a checkbox to toggle its enabled status.
async function renderRoboChatters() {
    try {
        const robochatters = await DataModel.getAllRoboChatters();  // Fetch the list of RoboChatters

        // Get the containers where RoboChatter divs will be added
        const container = document.getElementById('roboWindow');  // Main container for RoboChatters
        const offcanvasContainer = document.getElementById('offcanvas-roboWindow');  // Offcanvas container for RoboChatters

        // Helper function to clear the container, keeping only the first element (usually the title)
        function clearContainerExceptFirst(container) {
            while (container.children.length > 1) {
                container.removeChild(container.lastChild);  // Remove all child elements except the first one
            }
        }

        // Helper function to create a div for each RoboChatter
        // Includes a checkbox to toggle the enabled status and a label with the RoboChatter's name.
        function createRoboDiv(robo) {
            const roboDiv = document.createElement('div');
            roboDiv.classList.add('robochatter-item', 'd-flex', 'align-items-center', 'mb-2');  // Styling classes for layout and spacing

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = robo.enabled;  // Check the checkbox if RoboChatter is enabled
            checkbox.id = `robo-${robo.id}`;  // Unique ID for each checkbox
            checkbox.classList.add('me-2');  // Bootstrap class for margin

            // Add event listener to toggle RoboChatter's enabled status
            checkbox.addEventListener('change', () => toggleRobo(robo.id));

            const label = document.createElement('label');
            label.setAttribute('for', `robo-${robo.id}`);  // Associate label with the checkbox
            label.innerText = robo.name;  // Display RoboChatter's name

            roboDiv.appendChild(checkbox);
            roboDiv.appendChild(label);  // Append checkbox and label to the div

            return roboDiv;  // Return the completed RoboChatter div
        }

        // Clear existing content in both containers (keeping only the first element)
        clearContainerExceptFirst(container);
        clearContainerExceptFirst(offcanvasContainer);

        // Loop through each RoboChatter and create divs for both containers
        robochatters.forEach(robo => {
            const roboDiv = createRoboDiv(robo);  // Create div for the main container
            const offcanvasRoboDiv = createRoboDiv(robo);  // Create div for the offcanvas container

            container.appendChild(roboDiv);  // Add to the main container
            offcanvasContainer.appendChild(offcanvasRoboDiv);  // Add to the offcanvas container
        });

    } catch (error) {
        console.error('Error rendering RoboChatters:', error);  // Log any errors during rendering
    }
}

// Function to toggle the enabled status of a RoboChatter
// Sends a request to the server to toggle the RoboChatter's status and optionally sends a message.
async function toggleRobo(roboID) {
    try {
        const updatedRobo = await DataModel.toggleRoboChatter(roboID);  // Toggle RoboChatter's status

        if (updatedRobo) {
            console.log(`RoboChatter with ID ${roboID} updated. New status: ${updatedRobo.enabled ? 'Enabled' : 'Disabled'}`);
            // Optionally send a message when the RoboChatter is enabled/disabled
            if (!updatedRobo.enabled) {
                ChatSocket.sendMessage('disabled a robot...');
            } else {
                ChatSocket.sendMessage('enabled a robot...');
            }
        } else {
            console.error(`Failed to update RoboChatter with ID ${roboID}`);  // Log error if update fails
        }
    } catch (error) {
        console.error(`Error toggling RoboChatter with ID ${roboID}:`, error);  // Log any errors during the toggle operation
    }
}

// Function to display a new chat message in the chat window
// Appends the new message to the chat window and auto-scrolls if the user is already at the bottom.
function showNewChat(messageData) {
    const chatWindow = document.getElementById('chatWindow');
    const newMessage = document.createElement('div');
    newMessage.classList.add('chat-message');
    newMessage.innerText = messageData.message;  // Set the text of the new message
    chatWindow.appendChild(newMessage);  // Append the message to the chat window

    const scrollBuffer = 100;  // Small buffer to account for minor scroll height inconsistencies

    // Check if the user is scrolled to the bottom
    const isScrolledToBottom = Math.abs(chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight) <= scrollBuffer;

    // If user is scrolled to the bottom, auto-scroll down
    if (isScrolledToBottom) {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

// Function to handle the log-off action
// Logs off the user by disconnecting from WebSocket, clearing the JWT token, and redirecting to the login page.
function logOffUser() {
    console.log('Logging off the user...');
    ChatSocket.disconnect();  // Disconnect from the WebSocket server
    localStorage.removeItem('jwtToken');  // Clear the JWT token from local storage
    window.location.href = '/';  // Redirect to the login page
}

// Function to refresh the chatters list and update the lurker count
// Clears the existing chatters and lurkers, and repopulates them with updated data.
function refreshChatters(usernames, lurkerCount) {
    const chattersContainer = document.getElementById('chattersWindow');
    const offCanvasChattersContainer = document.getElementById('offCanvasChatters');
    const lurkersContainer = document.getElementById('lurkerCount');
    const offCanvasLurkersContainer = document.getElementById('offcanvas-lurkerCount');

    // Update the lurker count in both main and offcanvas containers
    lurkersContainer.textContent = lurkerCount;
    offCanvasLurkersContainer.textContent = lurkerCount;

    // Clear existing chatters from both containers
    chattersContainer.querySelectorAll('.chatter').forEach(chatter => chatter.remove());
    offCanvasChattersContainer.querySelectorAll('.chatter').forEach(chatter => chatter.remove());

    // Loop through the list of usernames and create new divs for each user
    usernames.forEach(username => {
        console.log('Adding chatter:', username);

        const chatterDiv = document.createElement('div');
        chatterDiv.classList.add('chatter');
        chatterDiv.textContent = username;  // Set the username for the chatter
        chattersContainer.appendChild(chatterDiv);  // Add to main chatters window

        const offCanvasChatterDiv = document.createElement('div');
        offCanvasChatterDiv.classList.add('chatter');
        offCanvasChatterDiv.textContent = username;  // Set the username for the chatter
        offCanvasChattersContainer.appendChild(offCanvasChatterDiv);  // Add to offcanvas chatters window
    });
}

function resizeViewport(offset = 0) {
    if(window.visualViewport){
        let vh = window.visualViewport.height * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    else{
        let vh = window.innerHeight * 0.01;
        //document.documentElement.style.setProperty('--vh', `${vh-(offset*0.01)}px`);
        document.documentElement.style.setProperty('--vh', `${vh-(offset*0.01)}px`);
        //alert("resizing to: " + vh);
    }
}

// Set up the ChatSocket connection and event listeners when the document loads
// Initializes the WebSocket connection and sets event listeners for sending messages, logging off, and rendering RoboChatters.
window.addEventListener('load', () => {
    resizeViewport();

    window.addEventListener('resize', () => {
        resizeViewport();
    });

    ChatSocket.connect();  // Establish the WebSocket connection

    // Set the callback functions to handle new messages and refresh the chatters/robots list
    ChatSocket.setMessageCallback(showNewChat);
    ChatSocket.setRefreshChattersCallback(refreshChatters);
    ChatSocket.setRefreshRobotsCallback(renderRoboChatters);

    // Set up event listener for sending messages when the send button is clicked
    document.getElementById('sendMessage').addEventListener('click', () => {
        const messageInput = document.getElementById('messageInput');
        sendChat(messageInput.value);  // Send the chat message
        messageInput.value = '';  // Clear the input field after sending
    });

    // Event listener to send a message when the Enter key is pressed (without Shift)
    document.getElementById('messageInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {  // Check for Enter key and ensure Shift is not pressed
            event.preventDefault();  // Prevent the default behavior (new line)
            const messageInput = document.getElementById('messageInput');
            sendChat(messageInput.value);  // Send the chat message
            messageInput.value = '';  // Clear the input field after sending
        }
    });

    document.getElementById("messageInput").addEventListener("focus", function() {
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            if(window.visualViewport){
                resizeViewport();
            }
            else {
                resizeViewport(500);
            }
        } 
    });

    document.getElementById("messageInput").addEventListener("blur", function() {
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            resizeViewport();
        } 
    });


    // Set up event listener for the log-off button (main and offcanvas)
    document.getElementById('logOffButtonMain').addEventListener('click', () => {
        logOffUser();  // Log off the user from the main button
    });

    document.getElementById('logOffButtonOffCanvas').addEventListener('click', () => {
        logOffUser();  // Log off the user from the offcanvas button
    });

    // Render the RoboChatters on page load
    renderRoboChatters();
});