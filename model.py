from extensions import db  # Import db from extensions.py

# User model representing the 'user' table in the database.
class User(db.Model):
    __tablename__ = 'user'  # Specifies the table name

    # Define the columns for the 'user' table
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # Primary key
    email = db.Column(db.String(120), unique=True, nullable=False)  # Email field, unique and required
    name = db.Column(db.String(120), nullable=False)  # Name field, required
    password = db.Column(db.String(128), nullable=False)  # Password field, required (hashed)

    # String representation of the User object for debugging
    def __repr__(self):
        return f'<User {self.name}>'


# RoboChatter model representing the 'robochatters' table in the database.
class RoboChatter(db.Model):
    __tablename__ = 'robochatters'  # Specifies the table name

    # Define the columns for the 'robochatters' table
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # Primary key
    name = db.Column(db.String(255), nullable=False)  # Name field, required
    description = db.Column(db.Text, nullable=True)  # Optional description field
    enabled = db.Column(db.Boolean, default=True, nullable=False)  # Boolean field to indicate if the RoboChatter is active

    # String representation of the RoboChatter object for debugging
    def __repr__(self):
        return f'<RoboChatter {self.name}>'


# ChatHistory model representing the 'chat_history' table in the database.
class ChatHistory(db.Model):
    __tablename__ = 'chat_history'  # Specifies the table name

    # Define the columns for the 'chat_history' table
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # Primary key
    message = db.Column(db.Text, nullable=False)  # The chat message content
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())  # Timestamp of when the message was created

    # String representation of the ChatHistory object for debugging
    def __repr__(self):
        return f'<ChatHistory id={self.id}, message="{self.message[:20]}...">'
    
class Settings(db.Model):
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    key_name = db.Column(db.String(255), unique=True, nullable=False)  # Key name to identify each setting
    value = db.Column(db.Text, nullable=False)  # Stores the prompt or other settings
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __repr__(self):
        return f'<Settings {self.key_name}>'