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

    // Check if the message contains a colon to differentiate system messages
    if (messageData.message.includes(':')) {
        newMessage.classList.add('highlight-background');
        // Split the message into the name part and the actual message
        const [namePart, messagePart] = messageData.message.split(/:(.+)/); // Split on the first colon

        // Create span for the name part and apply the appropriate class
        const nameSpan = document.createElement('span');
        nameSpan.textContent = namePart + ": "; // Add colon after name

        if (messageData.user) {
            nameSpan.classList.add('chatterIndicator');  // Apply 'chatterIndicator' if it's a user message
        } else if (messageData.robot) {
            nameSpan.classList.add('robotIndicator');  // Apply 'robotIndicator' if it's a robot message
        }

        // Create span for the message part (after the colon)
        const messageSpan = document.createElement('span');
        messageSpan.textContent = messagePart;  // The actual message

        // Append both spans to the new message div
        newMessage.appendChild(nameSpan);
        newMessage.appendChild(messageSpan);
    } else {
        // No colon means it's a system message, apply systemMessage class to the entire message
        newMessage.classList.add('systemMessage');  // Apply system message class
        newMessage.textContent = messageData.message;  // Display the full message as-is
    }

    const scrollBuffer = 100;  // Small buffer to account for minor scroll height inconsistencies
    // Check if the user is scrolled to the bottom
    const isScrolledToBottom = (chatWindow.scrollTop + chatWindow.clientHeight) >= (chatWindow.scrollHeight - scrollBuffer);

    // Append the message to the chat window
    chatWindow.appendChild(newMessage);

    // If user is scrolled to the bottom, auto-scroll down
    if (isScrolledToBottom) {
        scrollChatWindow();
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
        document.getElementById('maincontainer').style.height = `${vh}px`;
        document.querySelector('.row').style.height = `${vh}px`;
        const chatWindow = document.getElementById('chatWindow');
        const remainingHeight = vh - document.getElementById('messageInput').offsetHeight;
        chatWindow.style.height = `${remainingHeight}px`;
    }
    else{
        let vh = window.innerHeight * 0.01;
        //document.documentElement.style.setProperty('--vh', `${vh-(offset*0.01)}px`);
        document.documentElement.style.setProperty('--vh', `${vh-(offset*0.01)}px`);
        document.getElementById('maincontainer').style.height = `${vh-(offset*0.01)}px`;
        document.querySelector('.row').style.height =  `${vh-(offset*0.01)}px`;
        const chatWindow = document.getElementById('chatWindow');
        const remainingHeight = vh - (offset*0.01) - document.getElementById('messageInput').offsetHeight;
        chatWindow.style.height = `${remainingHeight}px`;

        //alert("resizing to: " + vh);
    }
    //document.documentElement.scrollTop = 0;
    window.scrollTo({
        top: 0,
        behavior: 'auto' // Or 'auto' if 'instant' is not available
      });

}

function scrollChatWindow(){
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function keyboardOut(){
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.getElementById('maincontainer').style.height = `${vh}px`;
    document.querySelector('.row').style.height = `${vh}px`;
    document.getElementById('chatWindow').style.height = 'auto';  // Reset chat window height
    const totalScroll = document.getElementById('chatWindow').scrollHeight - document.getElementById('chatWindow').clientHeight;
    const currentScroll = document.getElementById('chatWindow').scrollTop;
    if (currentScroll >= totalScroll) {
        document.getElementById('chatWindow').scrollTop = totalScroll;  // Scroll to the bottom if already there
    }


    window.scrollTo({
        top: 0,
        behavior: 'auto' // Or 'auto' if 'instant' is not available
      });

}

// This function will be called whenever the typing indicator needs to be updated
let typingInterval = null;  // To store the interval ID for cycling periods

function updateTypingIndicator(userTyping, robotTyping) {
    const typingIndicator = document.getElementById('typingIndicator');
    
    // Clear previous classes
    typingIndicator.classList.remove('chatterIndicator', 'robotIndicator', 'chatterAndRobotIndicator');

    // Clear any existing interval if no one is typing
    if (!userTyping && !robotTyping) {
        typingIndicator.innerText = ""; // Clear the text if no one is typing
        if (typingInterval) {
            clearInterval(typingInterval);  // Stop the cycling periods
            typingInterval = null;  // Reset the interval
        }
        return;
    }

    let baseText = ""; // This will hold the base text without periods

    if (userTyping && robotTyping) {
        baseText = "A Chatter and a Robot are typing";
        typingIndicator.classList.add('chatterAndRobotIndicator');
    } else if (userTyping) {
        baseText = "A Chatter is typing";
        typingIndicator.classList.add('chatterIndicator');
    } else if (robotTyping) {
        baseText = "A Robot is typing";
        typingIndicator.classList.add('robotIndicator');
    }

    let periodCount = 0;  // Start with 0 periods

    // If an interval is already running, clear it to avoid multiple intervals
    if (typingInterval) {
        clearInterval(typingInterval);
    }

    // Set up the interval to update the text every 500ms (0.5s)
    typingInterval = setInterval(() => {
        typingIndicator.innerText = `${baseText}${'.'.repeat(periodCount)}`;
        periodCount = (periodCount + 1) % 4;  // Cycle between 0, 1, 2, and 3 periods
    }, 500);  // Adjust the duration (500ms) as needed for faster/slower cycling
}


// Set up the ChatSocket connection and event listeners when the document loads
// Initializes the WebSocket connection and sets event listeners for sending messages, logging off, and rendering RoboChatters.
window.addEventListener('load', () => {
    resizeViewport();

    //window.addEventListener('resize', () => {
    //    resizeViewport();
    //});

    window.visualViewport.addEventListener('resize', () => {
        if (!/Mobi|Android/i.test(navigator.userAgent)) {
            resizeViewport();
        }

    });

    
    document.addEventListener('touchmove', function(e) {
        // Get the element being touched
        const targetElement = e.target;
    
        // Check if the target element is the maincontent container or a descendant of it
        if (!targetElement.closest('#chatWindow')) {
            // Prevent default scroll behavior for all elements except maincontent
            e.preventDefault();
        }
    }, { passive: false });

    // Select the elements
    const htmlElement = document.documentElement; // html tag
    const bodyElement = document.body; // body tag
    const mainContainer = document.getElementById('maincontainer'); // maincontainer div
    const rowElement = document.querySelector('.row'); // row div

    // Function to prevent scrolling
    function preventScroll(event) {
        event.target.scrollTop = 0;
        event.target.scrollLeft = 0;
    }

    // Attach scroll event listeners
    htmlElement.addEventListener('scroll', preventScroll);
    bodyElement.addEventListener('scroll', preventScroll);
    mainContainer.addEventListener('scroll', preventScroll);
    rowElement.addEventListener('scroll', preventScroll);
    

    const chatWindow = document.getElementById('chatWindow');

    // Prevent scroll propagation and handle top/bottom scrolling
    chatWindow.addEventListener('touchmove', function(e) {
        // Get the total scrollable distance
        const totalScroll = chatWindow.scrollHeight - chatWindow.clientHeight;
        // Get the current scroll position
        const currentScroll = chatWindow.scrollTop;

        // Stop the event from propagating to parent containers
        e.stopPropagation();

        // Handle scrolling at the top and bottom
        if (totalScroll > 0) {
            if (currentScroll <= 0 && e.touches[0].clientY > 0) {
                // If at the top and trying to scroll up, scroll slightly down to prevent locking
                chatWindow.scrollTop = 1;
                e.preventDefault();
            } else if (currentScroll >= totalScroll && e.touches[0].clientY < 0) {
                // If at the bottom and trying to scroll down, scroll slightly up to prevent locking
                chatWindow.scrollTop = totalScroll - 1;
                e.preventDefault();
            }
        } else {
            // If there is no scrollable content, prevent any scrolling
            e.preventDefault();
        }
    });

    // Listen for the 'scroll' event to ensure proper behavior
    chatWindow.addEventListener('scroll', function(e) {
        const totalScroll = chatWindow.scrollHeight - chatWindow.clientHeight;
        const currentScroll = chatWindow.scrollTop;

        // If at the top or bottom, adjust the scroll slightly to prevent locking
        if (currentScroll <= 0) {
            chatWindow.scrollTop = 1; // Prevent sticking at the top
        } else if (currentScroll >= totalScroll) {
            chatWindow.scrollTop = totalScroll - 1; // Prevent sticking at the bottom
        }
    });



    ChatSocket.connect();  // Establish the WebSocket connection

    // Set the callback functions to handle new messages and refresh the chatters/robots list
    ChatSocket.setMessageCallback(showNewChat);
    ChatSocket.setRefreshChattersCallback(refreshChatters);
    ChatSocket.setRefreshRobotsCallback(renderRoboChatters);
    // Set this function as the typing indicator callback in ChatSocket
    ChatSocket.setTypingIndicatorCallback(updateTypingIndicator);


    // Set up event listener for sending messages when the send button is clicked
    document.getElementById('sendMessage').addEventListener('click', () => {
        const messageInput = document.getElementById('messageInput');
        sendChat(messageInput.value);  // Send the chat message
        scrollChatWindow();
        messageInput.value = '';  // Clear the input field after sending
    });

    // Event listener to send a message when the Enter key is pressed (without Shift)
    document.getElementById('messageInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {  // Check for Enter key and ensure Shift is not pressed
            event.preventDefault();  // Prevent the default behavior (new line)
            const messageInput = document.getElementById('messageInput');
            sendChat(messageInput.value);  // Send the chat message
            scrollChatWindow();
            messageInput.value = '';  // Clear the input field after sending
        }
    });

    document.getElementById("messageInput").addEventListener("focus", function() {
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            if(window.visualViewport){
                setTimeout(() => {
                    // Your resize logic here
                    resizeViewport();
                    var chatWindow = document.getElementById("chatWindow");
                    chatWindow.scrollTop = chatWindow.scrollHeight;
                }, 300);             }
            else {
                resizeViewport(500);
            }
        } 
    });

    document.getElementById("messageInput").addEventListener("blur", function(event) {
        if (/Mobi|Android/i.test(navigator.userAgent)) {
        //    setTimeout(() => {
        //        keyboardOut();
         //   }, 100);
            if (event.relatedTarget === document.getElementById('sendMessage')) {
                event.preventDefault();  // This stops the default behavior
                  document.getElementById("messageInput").focus();
            }
            else{
                keyboardOut();
            }
        } 
    });

    document.getElementById('sendMessage').addEventListener('touchstart', function(event) {
        event.preventDefault(); // Prevents the default behavior that causes the blur
        document.getElementById("messageInput").focus();  // Keep the input focused so that the keyboard stays up
        sendChat(document.getElementById("messageInput").value);
        document.getElementById("messageInput").value = '';  // Clear the input field after sending

    });

    document.getElementById('sendMessage').addEventListener('mousedown', function(event) {
        event.preventDefault(); // Same logic for desktop browsers
        document.getElementById("messageInput").focus();
        sendChat(document.getElementById("messageInput").value);
        document.getElementById("messageInput").value = '';  // Clear the input field after sending
    });


    // Set up event listener for the log-off button (main and offcanvas)
    document.getElementById('logOffButtonMain').addEventListener('click', () => {
        logOffUser();  // Log off the user from the main button
    });

    document.getElementById('logOffButtonOffCanvas').addEventListener('click', () => {
        logOffUser();  // Log off the user from the offcanvas button
    });

    let lastTypingTime = 0;
    const THROTTLE_TIME = 2000;  // Minimum time between typing events (2 seconds)

    // Listener for the 'input' event on the message input field
    document.getElementById('messageInput').addEventListener('input', () => {
        const currentTime = Date.now();

        // Check if enough time has passed since the last typing event
        if (currentTime - lastTypingTime > THROTTLE_TIME) {
            ChatSocket.emitTypingEvent();  // Emit typing event
            lastTypingTime = currentTime;  // Update last typing time
        }
    });

    // Render the RoboChatters on page load
    renderRoboChatters();
});