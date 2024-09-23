import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Initialize the SQLAlchemy object globally.
# This will be used to interact with the database throughout the app.
db = SQLAlchemy()

# Initialize SocketIO globally, allowing cross-origin resource sharing (CORS).
# This enables real-time communication with WebSocket support.
socketio = SocketIO(cors_allowed_origins="*")

# JWT Manager for handling JSON Web Tokens (JWT).
# This will manage user authentication via tokens.
jwt = JWTManager()

# Function to create the Flask app instance and initialize extensions
def create_app():
    # Initialize Flask app
    app = Flask(__name__)

    # Set configuration values for the app.
    # These values are fetched either from environment variables or from the config.py file.
    # The database URI, tracking modifications, and the secret key for session management are set here.
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', Config.SQLALCHEMY_DATABASE_URI)
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.getenv('SQLALCHEMY_TRACK_MODIFICATIONS', Config.SQLALCHEMY_TRACK_MODIFICATIONS)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', Config.SECRET_KEY)

    # Initialize extensions within the Flask app context.
    # The app context is necessary to bind the app instance with these extensions.
    db.init_app(app)  # Initialize the SQLAlchemy database connection
    socketio.init_app(app)  # Initialize the SocketIO connection for real-time features
    jwt.init_app(app)  # Initialize JWT for authentication management
    
    # CORS(app)  # Uncomment to enable CORS for cross-origin requests if needed

    # Import and register blueprints for routing.
    # This avoids circular imports and ensures the routes are registered correctly.
    from routes import routes_blueprint
    app.register_blueprint(routes_blueprint)

    # Create database tables if they don't already exist.
    # The app context is needed here to create the tables using SQLAlchemy.
    with app.app_context():
        db.create_all()

    # Import the WebSockets module to register event handlers for WebSocket communication.
    # This is imported after app and socketio are initialized to avoid errors.
    from websockets import register_websocket_handlers
    register_websocket_handlers(socketio)

    # Return the initialized app instance
    return app

# Entry point for running the application directly.
# This will create the app instance and start the SocketIO server in debug mode.
if __name__ == "__main__":
    app = create_app()

    # Start the SocketIO server with Flask's app.
    # This will allow handling real-time events alongside standard HTTP requests.
    socketio.run(app, debug=True)