from flask_socketio import emit, disconnect
from flask import request
from flask_jwt_extended import decode_token
from extensions import db, socketio  # Import socketio and db from extensions.py
from model import User, ChatHistory, RoboChatter  # Import the User model here after db is initialized

# Function to register WebSocket event handlers for real-time communication
def register_websocket_handlers(socketio):
    # Handle the event when a client connects to the WebSocket
    @socketio.on('connect')
    def handle_connect():
        print("Client attempting to connect...")  # Log connection attempt
        token = request.args.get('token')  # Retrieve the JWT token from query parameters
        print(f"Token received: {token}")  # Log the received token

        if not token:
            print("No token provided, disconnecting client.")
            # If no token is provided, emit a connection error and disconnect the client
            emit('connect_error', {'error': 'No token provided. Disconnecting...'})
            disconnect()
            return

        try:
            # Decode the JWT token to verify user identity
            decoded_token = decode_token(token)
            user = User.query.filter_by(email=decoded_token['sub']).first()  # Fetch the user by email

            if user:
                print(f"Token successfully decoded: {decoded_token}")  # Log successful token decoding
                
                # Emit a success message to the connected client
                emit('connect_success', {'message': f'Client connected with token: {decoded_token}'})
                
                # Broadcast a message that the user has entered the chat to all clients
                emit('broadcast_message', {
                    'message': f"{user.name} has entered the chat...",
                    'user': f"{user.name}",
                    'event': "new_chatter",
                    'user_count': f"{count_connected_clients()}"
                }, broadcast=True)
                
                if(count_connected_clients()==1):
                # Enable all RoboChatters
                    robochatters = RoboChatter.query.all()  # Fetch all RoboChatters from the database
                    for robochatter in robochatters:
                        robochatter.enabled = True  # Set enabled to True for all RoboChatters
                    db.session.commit()  # Commit changes to the database
                    emit('system_message', {'event': "refresh_robots"}, broadcast=True)  # Broadcast a message to refresh the robots

            else:
                emit('broadcast_message', {'error': 'User not found'}, broadcast=False)

        except Exception as e:
            # Handle errors during token decoding and disconnect the client
            print(f"Error decoding token: {str(e)}")  # Log the specific error encountered
            emit('connect_error', {'error': f'Invalid token: {str(e)}. Disconnecting...'})
            disconnect()
            print("Client disconnected due to invalid token.")

    # Handle the event when a client sends a message
    @socketio.on('send_message')
    def handle_message(data):
        message = data.get('message')  # Retrieve the message text
        token = data.get('token')  # Retrieve the JWT token

        if not token:
            # If no token is provided, emit an error message
            emit('broadcast_message', {'error': 'No token provided'}, broadcast=False)
            return

        try:
            # Decode the JWT token to verify user identity
            decoded_token = decode_token(token)
            user = User.query.filter_by(email=decoded_token['sub']).first()  # Fetch the user by email

            if user:
                user_message = f"{user.name}: {message}"  # Format the message
                if not isRobotActionMessage(message):
                    try:
                        db = current_app.extensions['sqlalchemy'].db
                        # Create a new ChatHistory entry
                        chat_history_entry = ChatHistory(message=user_message)
                        db.session.add(chat_history_entry)  # Add it to the session
                        db.session.commit()  # Commit the transaction to save to the database
                        # Check if the object now has a valid ID assigned by the database
                        if chat_history_entry.id:
                            print(f"Chat history entry successfully saved with ID: {chat_history_entry.id}")
                        else:
                            print("Commit succeeded, but no ID was returned.")                    
                    except Exception as db_error:
                        # Log any database errors
                        print(f"Error saving chat history to database: {str(db_error)}")
                        db.session.rollback()  # Rollback in case of error to maintain session integrity

                # Check if the message is a robot action message (enabling/disabling a robot)
                if isRobotActionMessage(message):
                    # Broadcast the robot action message to all clients
                    emit('broadcast_message', {'message': f"{user.name}: {message}", 'user': f"{user.name}", 'user_count': f"{count_connected_clients()}", 'event': "refresh_robots"}, broadcast=True)
                else:
                    # Broadcast the regular chat message to all clients
                    emit('broadcast_message', {'message': f"{user.name}: {message}", 'user': f"{user.name}", 'user_count': f"{count_connected_clients()}"}, broadcast=True)
            else:
                emit('broadcast_message', {'error': 'User not found'}, broadcast=False)

        except Exception as e:
            # Handle errors during token decoding and emit an error message
            emit('broadcast_message', {'error': f'Invalid token: {str(e)}'}, broadcast=False)

    # Handle the event when a client disconnects from the WebSocket
    @socketio.on('disconnect')
    def handle_disconnect():
        token = request.args.get('token')  # Retrieve the token from the socket object

        if not token:
            # If no token is provided, assume an unknown user and broadcast the disconnect event
            emit('broadcast_message', {'message': f"unknown user has left the chat...", 'event': "remove_chatter", 'user_count': f"{count_connected_clients()}"}, broadcast=True)
            return

        try:
            # Decode the token and query the user
            decoded_token = decode_token(token)
            user = User.query.filter_by(email=decoded_token['sub']).first()  # Fetch the user by email

            if user:
                # Broadcast that the user has left the chat
                emit('broadcast_message', {'message': f"{user.name} has left the chat...", 'user': f"{user.name}", 'event': "remove_chatter", 'user_count': f"{count_connected_clients()}"}, broadcast=True)
            else:
                # Broadcast the disconnect event for an unknown user
                emit('broadcast_message', {'message': f"unknown user has left the chat...", 'event': "remove_chatter", 'user_count': f"{count_connected_clients()}"}, broadcast=True)

        except Exception as e:
            # Log any errors that occur during disconnect handling
            print(f"Error during disconnect: {str(e)}")

# Utility function to count the number of connected clients
from flask import current_app

def count_connected_clients():
    # Access the current app's SocketIO instance
    socketio = current_app.extensions['socketio']  # Retrieve the socketio instance

    # The `eio.sockets` dictionary contains all currently connected clients
    connected_clients = socketio.server.eio.sockets
    
    # Count the number of connected clients
    clients = len(connected_clients)
    
    print(f"Total connected clients: {clients}")  # Log the total number of clients
    return clients

# Utility function to check if a message relates to a robot action
def isRobotActionMessage(text):
    return "enabled a robot..." in text or "disabled a robot..." in text  # Return True if the message is about enabling/disabling a robot