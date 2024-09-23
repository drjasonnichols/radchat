from app import db

# User model representing the 'user' table in the database.
# This class defines the structure of the user table, which stores user account information.
class User(db.Model):
    __tablename__ = 'user'  # Specifies the table name as 'user'

    # Columns/Fields in the 'user' table:
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # Primary key, auto-increments
    email = db.Column(db.String(120), unique=True, nullable=False)  # Unique email address, required field
    name = db.Column(db.String(120), nullable=False)  # User's name, required field
    password = db.Column(db.String(128), nullable=False)  # Password field, required field (hashed)

    # __repr__ method to provide a readable string representation of the object.
    # This is useful for debugging and displaying the User model as a string.
    def __repr__(self):
        return f'<User {self.name}>'

# RoboChatter model representing the 'robochatters' table in the database.
# This class defines the structure of the robochatters table, which stores AI/robot chat entities.
class RoboChatter(db.Model):
    __tablename__ = 'robochatters'  # Specifies the table name as 'robochatters'

    # Columns/Fields in the 'robochatters' table:
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # Primary key, auto-increments
    name = db.Column(db.String(255), nullable=False)  # Name of the RoboChatter, required field
    description = db.Column(db.Text, nullable=True)  # Optional description field
    enabled = db.Column(db.Boolean, default=True, nullable=False)  # Boolean field to indicate if RoboChatter is active/enabled

    # __repr__ method to provide a readable string representation of the object.
    # This is useful for debugging and displaying the RoboChatter model as a string.
    def __repr__(self):
        return f'<RoboChatter {self.name}>'