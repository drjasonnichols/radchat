// Wait until the DOM is fully loaded before attaching event listeners
document.addEventListener("DOMContentLoaded", function() {

    // Get the login form and login button elements
    const loginForm = document.querySelector("form");
    const loginButton = loginForm.querySelector("button[type='submit']");

    // Attach event listener to the login button
    // When clicked, the login button prevents default form submission and gathers username and password
    loginButton.addEventListener("click", function(event) {
        event.preventDefault();  // Prevent the form from submitting the traditional way

        // Get the username and password input values
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        // Call the login handler with the provided username and password
        handleLoginClick(username, password);
    });

    // Get the registration form element
    const registerForm = document.getElementById('registerForm');

    // Attach event listener to the registration form submission
    // Prevents default submission and gathers registration form data (email, name, password)
    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();  // Prevent the form from submitting the traditional way

        // Capture form data
        const email = document.getElementById('registerEmail').value;
        const name = document.getElementById('registerName').value;
        const password = document.getElementById('registerPassword').value;

        // Call the registration handler with the captured data
        handleRegistration(email, name, password);
    });

    // Capture click event on the "Register" link
    // When clicked, prevents default link navigation and opens the registration modal
    const registerLink = document.getElementById('registerLink');
    registerLink.addEventListener('click', function(event) {
        event.preventDefault();  // Prevent default navigation behavior
        showRegisterModal();     // Show the registration modal
    });
});

// Function to handle login process
// Sends a login request to the server with username and password (up to 3 retries on server error)
function handleLoginClick(username, password, attempt = 1) {
    fetch('/login', {
        method: 'POST',  // Send POST request to login endpoint
        headers: {
            'Content-Type': 'application/json',  // Send data as JSON
        },
        body: JSON.stringify({
            email: username,  // Username is assumed to be the email field
            password: password  // Include password in the request body
        }),
    })
    .then(response => {
        if (response.status === 500 && attempt <= 3) {
            // Retry the login on internal server error (up to 3 attempts)
            console.warn('Internal Server Error during login. Retrying attempt:', attempt);
            return new Promise((resolve) => setTimeout(resolve, 3))  // 3ms delay between retries
                .then(() => handleLoginClick(username, password, attempt + 1));  // Recursive retry call
        }
        return response.json();  // Parse response as JSON if not a 500 error
    })
    .then(data => {
        if (data.error) {
            // Handle login failure (e.g., display error message)
            alert('Login failed: ' + data.error);
        } else {
            // Store the JWT token in localStorage for future authentication
            localStorage.setItem('jwtToken', data.token);

            // Redirect to the chat window page upon successful login
            window.location.href = '/chatwindow';
        }
    })
    .catch((error) => {
        // Log any errors that occur during the request
        console.error('Error:', error);
    });
}

// Function to handle the registration process
// Sends a registration request to the server with email, name, and password (up to 3 retries on server error)
function handleRegistration(email, name, password, attempt = 1) {
    fetch('/create_account', {
        method: 'POST',  // Send POST request to create_account endpoint
        headers: {
            'Content-Type': 'application/json',  // Send data as JSON
        },
        body: JSON.stringify({
            email: email,  // Include email in the request body
            name: name,  // Include name in the request body
            password: password  // Include password in the request body
        }),
    })
    .then(response => {
        if (response.status === 500 && attempt <= 3) {
            // Retry the registration on internal server error (up to 3 attempts)
            console.warn('Internal Server Error. Retrying attempt:', attempt);
            return new Promise((resolve) => setTimeout(resolve, 3))  // 3ms delay between retries
                .then(() => handleRegistration(email, name, password, attempt + 1));  // Recursive retry call
        }
        return response.json();  // Parse response as JSON if not a 500 error
    })
    .then(data => {
        if (data.error) {
            // Handle registration failure (e.g., display error message)
            alert('Error creating account: ' + data.error);
        } else {
            // Display success message upon successful account creation
            alert('Account created successfully!');

            // Automatically populate login fields with the registered email and password
            document.getElementById('username').value = email;  // Pre-fill username (assumed to be email)
            document.getElementById('password').value = password;  // Pre-fill password

            // Hide the registration modal after successful registration
            const registerModalElement = document.getElementById('registerModal');
            const registerModal = bootstrap.Modal.getInstance(registerModalElement);  // Get existing modal instance
            if (registerModal) {
                registerModal.hide();  // Hide the modal if instance exists
            } else {
                const newModal = new bootstrap.Modal(registerModalElement);
                newModal.hide();  // Hide the modal if new instance is created
            }
        }
    })
    .catch((error) => {
        // Log any errors that occur during the request
        console.error('Error:', error);
    });
}

// Function to show the registration modal
// Uses Bootstrap's Modal component to display the registration form
function showRegisterModal() {
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));  // Initialize the modal
    registerModal.show();  // Show the modal
}