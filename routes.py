import datetime
from flask import Blueprint, current_app, request, jsonify, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import decode_token
from app import db
import jwt
from model import User, RoboChatter  # Import the User and RoboChatter models

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
    user, error_response = validate_token(request)  # Validate the user's token
    if error_response:
        return error_response  # Return error if the token validation fails

    # Fetch the RoboChatter by ID, return 404 if not found
    robochatter = RoboChatter.query.get_or_404(robochatter_id)
    robochatter.enabled = not robochatter.enabled  # Toggle the enabled status
    db.session.commit()  # Commit the change to the database
    return jsonify({"id": robochatter.id, "name": robochatter.name, "enabled": robochatter.enabled}), 200  # Return updated status