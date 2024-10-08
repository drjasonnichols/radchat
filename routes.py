import datetime
import random
from flask import Blueprint, current_app, request, jsonify, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import decode_token
from extensions import db, socketio  # Import db from the newly created extensions.py file
import jwt
from model import User, RoboChatter, ChatHistory, Settings  # Import the User and RoboChatter models
import google.generativeai as genai
from flask import copy_current_request_context
import threading
import time

# Define a blueprint for routing (modularizes the app's routes)
routes_blueprint = Blueprint('routes', __name__)

# Default route to serve the index.html file (home page)
@routes_blueprint.route('/')
def index():
    return render_template('index.html')  # Render the index.html template when accessing '/'

# Route to serve the chat window HTML page
@routes_blueprint.route('/chatwindow', methods=['GET'])
def chatwindow():
    return render_template('chatwindow.html')  # Render the chat window template

# Route to handle account creation
@routes_blueprint.route('/create_account', methods=['POST'])
def create_account():
    data = request.json  # Extract the incoming JSON data from the request
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')

    # Check if any required fields are missing
    if not email or not name or not password:
        return jsonify({"error": "Missing email, name, or password"}), 400  # Return error if any fields are missing

    # Check if a user with the provided email already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "User with that email already exists"}), 400  # Return error if the email is already registered

    # Hash the user's password for security
    hashed_password = generate_password_hash(password, method='sha256')

    # Create a new User object
    new_user = User(email=email, name=name, password=hashed_password)
    db.session.add(new_user)  # Add the new user to the database session
    db.session.commit()  # Commit the transaction to save the new user

    return jsonify({"message": "Account created successfully!"}), 201  # Return success message

# Route to handle user login
@routes_blueprint.route('/login', methods=['POST'])
def login():
    data = request.json  # Extract the incoming JSON data from the request
    email = data.get('email')
    password = data.get('password')

    # Check if any required fields are missing
    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400  # Return error if email or password is missing

    # Check if the user exists and if the password matches
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 400  # Return error if credentials are invalid

    # Generate a JWT token that expires in 1 hour
    token = jwt.encode({
        'sub': user.email,  # Subject is the user's email
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)  # Token expiration time
    }, current_app.config['SECRET_KEY'], algorithm='HS256')  # Sign the token with the app's secret key

    return jsonify({"message": "Login successful!", "token": token}), 200  # Return success message and token

# Helper function to decode the JWT token and validate the user
def validate_token(request):
    auth_header = request.headers.get('Authorization', None)  # Extract the authorization header
    if not auth_header:
        return None, jsonify({"error": "Token is missing!"}), 401  # Return error if token is missing

    try:
        token = auth_header.split(" ")[1]  # Split the header and get the token (format: "Bearer <token>")
        decoded_token = decode_token(token)  # Decode the JWT token
        user = User.query.filter_by(email=decoded_token['sub']).first()  # Find the user by email
        if not user:
            return None, jsonify({"error": "User not found!"}), 404  # Return error if user not found
        return user, None  # Return the user if the token is valid
    except Exception as e:
        return None, jsonify({"error": f"Token error: {str(e)}"}), 401  # Return error if token validation fails

# Route to retrieve all RoboChatters
@routes_blueprint.route('/robochatters', methods=['GET'])
def get_all_robochatters():
    print("Getting all RoboChatters...")  # Log for debugging
    user, error_response = validate_token(request)  # Validate the user's token
    if error_response:
        return error_response  # Return error if the token validation fails

    # Fetch all RoboChatters from the database
    robochatters = RoboChatter.query.all()
    # Create a list of dictionaries with RoboChatter details
    result = [{"id": r.id, "name": r.name, "description": r.description, "enabled": r.enabled} for r in robochatters]
    return jsonify(result), 200  # Return the list of RoboChatters

# Route to toggle the enabled status of a specific RoboChatter by ID
@routes_blueprint.route('/robochatter/toggle/<int:robochatter_id>', methods=['POST'])
def toggle_robochatter(robochatter_id):
    user, error_response = validate_token(request)
    if error_response:
        return error_response

    robochatter = RoboChatter.query.get_or_404(robochatter_id)
    any_enabled_robochatter = db.session.query(RoboChatter).filter_by(enabled=True).first() is not None
    newstate = not robochatter.enabled
    robochatter.enabled = newstate
    db.session.commit()
    return jsonify({"id": robochatter.id, "name": robochatter.name, "enabled": robochatter.enabled}), 200

#private route for sending a robot typing notification
# New route that is only accessible via the correct API key
@routes_blueprint.route('/protected_notify', methods=['POST'])
def protected_notify():
    socketio = current_app.extensions['socketio']  # Retrieve the socketio instance
    
    # Check if any RoboChatter is enabled
    any_enabled_robochatter = db.session.query(RoboChatter).filter_by(enabled=True).first() is not None
    
    if not any_enabled_robochatter:
        return jsonify({'status': 'error', 'message': 'No active RoboChatters available to send typing event.'}), 400

    # Get the 'duration' from the request data, defaulting to 3 seconds if not provided
    data = request.get_json()  # Assuming you're sending JSON data in the POST request
    duration = data.get('duration', 15)  # Default duration is 15 seconds
    
    # Emit the typing event with 'robot' type and the provided or default duration
    socketio.emit('typing_event', {'type': 'robot', 'duration': duration})
    
    return jsonify({'status': 'success', 'message': f'Typing event emitted for robot with duration {duration} seconds'}), 200

#private route for making the robots talk
# New route that is only accessible via the correct API key
@routes_blueprint.route('/protected_task', methods=['POST'])
def protected_task():
    # Access the current app's SocketIO instance to count connected clients
    socketio = current_app.extensions['socketio']  # Retrieve the socketio instance
    connected_clients = socketio.server.eio.sockets  # Get all connected clients
    clients = len(connected_clients)  # Count the connected clients
    
    if clients == 0:
        print("No clients are connected to the WebSocket. Stopping execution.")
        return jsonify({"error": "No clients connected"}), 400

    print(f"Total connected clients: {clients}")  # Log the total number of clients

    # Retrieve the API key from app config
    gemini_api_key = current_app.config['GEMINI_API_KEY']

    # Set up the generative model with the API key
    genai.configure(api_key=gemini_api_key)

    # Fetch the enabled RoboChatters
    robochatters = RoboChatter.query.filter_by(enabled=True).all()
    if not robochatters:
        return jsonify({"error": "No RoboChatters are enabled"}), 400

    history_count = Settings.query.filter_by(key_name='history_count').first()
    if not history_count:
        return jsonify({"error": "History count setting not found"}), 500
    
    history_count = int(history_count.value)
    
    # Fetch the most recent messages, ordered by most recent
    chat_history = ChatHistory.query.order_by(ChatHistory.id.desc()).limit(history_count).all()

    # Ensure there is at least one message in the history
    if not chat_history:
        return jsonify({"error": "Chat history is empty"}), 400

    # Separate the newest message (first in the list) from the rest
    first_post = chat_history[0].message  # The newest message (first in the descending order list)
    remaining_chat_history = chat_history[1:]  # All other messages excluding the newest one

    # Reverse the remaining chat history to make it chronological (oldest to newest)
    # Use "---" as a delimiter between messages
    conversation_history = "\n---\n".join([message.message for message in reversed(remaining_chat_history)])
    
    # Retrieve the prompt template from the 'Settings' table
    prompt_template = Settings.query.filter_by(key_name='prompt_template').first()

    if not prompt_template:
        return jsonify({"error": "Prompt template not found"}), 500

    # Retrieve the 'last_robo' value from the Settings table
    last_robo_setting = Settings.query.filter_by(key_name='last_robot_chatter').first()

    # Ensure that the setting exists and has a valid value
    if last_robo_setting and last_robo_setting.value:
        last_robo = last_robo_setting.value
        
        # Check if the 'last_robo' exists in the 'robochatters' list
        robochatter_to_remove = next((robo for robo in robochatters if robo.name == last_robo), None)
        
        # If 'last_robo' is found and there are other robots in 'robochatters', remove it
        if robochatter_to_remove and len(robochatters) > 1:
            robochatters.remove(robochatter_to_remove)

    # After removal, you can proceed to select a random RoboChatter
    # Select a random RoboChatter
    selected_robochatter = random.choice(robochatters)

    # Fetch the 'last_robot_chatter' setting from the Settings table
    last_robo_setting = Settings.query.filter_by(key_name='last_robot_chatter').first()

    # If the setting exists, update its value; otherwise, create a new setting
    if last_robo_setting:
        last_robo_setting.value = selected_robochatter.name  # Update the value to the selected RoboChatter's name
    else:
        last_robo_setting = Settings(key_name='last_robot_chatter', value=selected_robochatter.name)
        db.session.add(last_robo_setting)

    # Commit the changes to the database
    db.session.commit()

    # Construct the final prompt by replacing placeholders in the template
    final_prompt = prompt_template.value.format(
        robochatter_name=selected_robochatter.name,
        robochatter_description=selected_robochatter.description,
        conversation_history=conversation_history,  # The reversed chronological order history
        first_post=first_post  # Pass the newest message as first_post
    )

    # Set up the generative model
    model = genai.GenerativeModel("gemini-1.5-flash")
    robot_message = ""

    try:
        # Try up to three times with 1-second intervals if it fails
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Generate a message directly using the prompt
                response = model.generate_content(final_prompt)
                robot_message = response.text
                break  # Exit the loop if successful
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(1)  # Wait for 1 second before retrying
                else:
                    raise  # Re-raise the exception if it's the last attempt

    except Exception as e:
        # Fetch all RoboChatters that are currently enabled
        robochatters = RoboChatter.query.filter_by(enabled=True).all()

        # Set enabled=False for each RoboChatter
        for robochatter in robochatters:
            robochatter.enabled = False

        # Commit the changes to the database
        db.session.commit()

        # Send a broadcast message indicating robots are now sleeping
        socketio.emit('broadcast_message', {
            'message': "The robots are sleeping now.  You can wake them back up after their quota resets.\n\nSorry.  It's a union thing...", 
            'event': "refresh_robots"
        })

        # Return a 500 error with the relevant message
        return jsonify({"error": f"Error generating message: OVER QUOTA!"}), 500

    # Broadcast the new message using WebSocket
    socketio.emit('broadcast_message', {'message': robot_message, 'robot': selected_robochatter.name})

    # Save the generated robot message to the chat history
    try:
        chat_history_entry = ChatHistory(message=robot_message)
        db.session.add(chat_history_entry)  # Add it to the session
        db.session.commit()  # Commit the transaction to save to the database
        print(f"Chat history entry successfully saved with ID: {chat_history_entry.id}")
    except Exception as db_error:
        print(f"Error saving chat history to database: {str(db_error)}")
        db.session.rollback()

    # Get the IDs of the 100 most recent messages
    recent_ids = db.session.query(ChatHistory.id).order_by(ChatHistory.id.desc()).limit(100).subquery()
    # Delete all records that are not in the most recent 100
    ChatHistory.query.filter(ChatHistory.id.notin_(recent_ids)).delete(synchronize_session=False)
    db.session.commit()

    # Return the robot's message
    return jsonify({"robot_message": robot_message}), 200