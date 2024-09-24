import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Initialize the SQLAlchemy object globally.
db = SQLAlchemy()

# Initialize SocketIO globally.
socketio = SocketIO(cors_allowed_origins="*")

# JWT Manager for handling authentication.
jwt = JWTManager()

# Try to import the Config class from config.py (only if it exists)
try:
    from config import Config
    config_available = True
except ImportError:
    print("config.py not found. Falling back to environment variables.")
    config_available = False

# Function to create the Flask app instance and initialize extensions.
def create_app():
    app = Flask(__name__)

    # If config.py is available, use it. Otherwise, rely on environment variables.
    if config_available:
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', Config.SQLALCHEMY_DATABASE_URI)
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.getenv('SQLALCHEMY_TRACK_MODIFICATIONS', Config.SQLALCHEMY_TRACK_MODIFICATIONS)
        app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', Config.SECRET_KEY)
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.getenv('SQLALCHEMY_TRACK_MODIFICATIONS', False)  # Default to False
        app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')  # Provide a default or ensure it's set in production

    # Initialize extensions within the app context.
    db.init_app(app)
    socketio.init_app(app)
    jwt.init_app(app)

    # Register blueprints for routing.
    from routes import routes_blueprint
    app.register_blueprint(routes_blueprint)

    # Create tables if they don't exist.
    with app.app_context():
        db.create_all()

    # Register WebSocket event handlers.
    from websockets import register_websocket_handlers
    register_websocket_handlers(socketio)

    return app

# Create the app instance.
app = create_app()

# Passenger WSGI expects `app` to be the WSGI callable.
# No need to call `socketio.run()` here since Passenger takes care of starting the app.