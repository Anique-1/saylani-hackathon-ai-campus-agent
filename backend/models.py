import sqlite3
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import json
from passlib.context import CryptContext
import jwt

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class DatabaseManager:
    def __init__(self, db_path: str = "campus_admin.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Initialize the database with required tables including users"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table for authentication
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        ''')
        
        # Students table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                department TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        ''')
        
        # Activity logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT,
                activity TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students (id)
            )
        ''')
        
        # Campus events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                event_date DATE,
                event_time TIME,
                location TEXT
            )
        ''')
        
        # Sessions table for session management
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Messages table for storing chat messages
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
        # Create sample data (students, events)
        self._create_default_data()
    
    def _create_default_data(self):
        """Create sample students and events if tables are empty"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if students table is empty and add sample data
        cursor.execute("SELECT COUNT(*) FROM students")
        if cursor.fetchone()[0] == 0:
            sample_students = [
                ("STU001", "Ali Ahmed", "Computer Science", "ali.ahmed@nust.edu.pk"),
                ("STU002", "Sara Khan", "Mathematics", "sara.khan@nust.edu.pk"),
                ("STU003", "Hassan Ali", "Engineering", "hassan.ali@nust.edu.pk"),
                ("STU004", "Fatima Sheikh", "Physics", "fatima.sheikh@nust.edu.pk"),
                ("STU005", "Omar Malik", "Computer Science", "omar.malik@nust.edu.pk"),
                ("STU006", "Ayesha Raza", "Biology", "ayesha.raza@nust.edu.pk"),
                ("STU007", "Usman Tariq", "Chemistry", "usman.tariq@nust.edu.pk"),
                ("STU008", "Zara Iqbal", "Engineering", "zara.iqbal@nust.edu.pk"),
                ("STU009", "Bilal Shah", "Mathematics", "bilal.shah@nust.edu.pk"),
                ("STU010", "Hiba Nasir", "Physics", "hiba.nasir@nust.edu.pk")
            ]
            
            cursor.executemany(
                "INSERT INTO students (id, name, department, email) VALUES (?, ?, ?, ?)",
                sample_students
            )
            
            # Add sample events
            sample_events = [
                ("NUST Tech Symposium 2024", "Annual technology conference", "2024-04-15", "10:00", "Main Auditorium"),
                ("Engineering Expo", "Student project showcase", "2024-04-20", "14:00", "Engineering Hall"),
                ("Career Fair", "Job opportunities for students", "2024-04-25", "09:00", "Campus Grounds"),
                ("Science Exhibition", "Research presentations", "2024-05-02", "11:00", "Science Building")
            ]
            
            cursor.executemany(
                "INSERT INTO events (title, description, event_date, event_time, location) VALUES (?, ?, ?, ?, ?)",
                sample_events
            )
        
        conn.commit()
        conn.close()

    # User management methods
    def create_user(self, username: str, email: str, password: str) -> bool:
        """Create a new user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            password_hash = pwd_context.hash(password)
            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                (username, email, password_hash)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False
    
    def verify_user(self, username: str, password: str) -> Optional[Dict]:
        """Verify user credentials"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, email, password_hash FROM users WHERE username = ? AND is_active = 1", (username,))
        row = cursor.fetchone()
        conn.close()
        
        if row and pwd_context.verify(password, row[3]):
            return {
                "id": row[0],
                "username": row[1],
                "email": row[2]
            }
        return None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, email, created_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "created_at": row[3]
            }
        return None

    # Session management methods
    def create_session(self, session_id: str, user_id: int) -> bool:
        """Create a new chat session"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sessions (id, user_id) VALUES (?, ?)",
                (session_id, user_id)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error creating session: {e}")
            return False
    
    def get_user_sessions(self, user_id: int) -> List[Dict]:
        """Get all sessions for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.id, s.created_at, s.last_activity, 
                   COUNT(m.id) as message_count,
                   COALESCE(MAX(m.created_at), s.created_at) as last_message_time
            FROM sessions s
            LEFT JOIN messages m ON s.id = m.session_id
            WHERE s.user_id = ? AND s.is_active = 1
            GROUP BY s.id, s.created_at, s.last_activity
            ORDER BY last_message_time DESC
        """, (user_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        sessions = []
        for row in rows:
            sessions.append({
                "session_id": row[0],
                "created_at": row[1],
                "last_activity": row[2],
                "message_count": row[3],
                "last_message_time": row[4]
            })
        
        return sessions
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, created_at, last_activity FROM sessions WHERE id = ? AND is_active = 1",
            (session_id,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "user_id": row[1],
                "created_at": row[2],
                "last_activity": row[3]
            }
        return None
    
    def update_session_activity(self, session_id: str) -> bool:
        """Update session last activity"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?",
                (session_id,)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error updating session activity: {e}")
            return False
    
    def delete_session(self, session_id: str, user_id: int) -> bool:
        """Delete a session (soft delete)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE sessions SET is_active = 0 WHERE id = ? AND user_id = ?",
                (session_id, user_id)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False

    # Message management methods
    def save_message(self, session_id: str, user_id: int, message_type: str, content: str) -> bool:
        """Save a chat message"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO messages (session_id, user_id, message_type, content) VALUES (?, ?, ?, ?)",
                (session_id, user_id, message_type, content)
            )
            # Update session last activity
            cursor.execute(
                "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?",
                (session_id,)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving message: {e}")
            return False
    
    def get_session_messages(self, session_id: str, user_id: int) -> List[Dict]:
        """Get all messages for a session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.id, m.message_type, m.content, m.created_at
            FROM messages m
            JOIN sessions s ON m.session_id = s.id
            WHERE m.session_id = ? AND s.user_id = ? AND s.is_active = 1
            ORDER BY m.created_at ASC
        """, (session_id, user_id))
        
        rows = cursor.fetchall()
        conn.close()
        
        messages = []
        for row in rows:
            messages.append({
                "id": row[0],
                "type": row[1],  # 'user' or 'ai'
                "content": row[2],
                "timestamp": row[3]
            })
        
        return messages
    
    def delete_session_messages(self, session_id: str, user_id: int) -> bool:
        """Delete all messages for a session"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            # Verify session belongs to user before deleting messages
            cursor.execute(
                "SELECT id FROM sessions WHERE id = ? AND user_id = ?",
                (session_id, user_id)
            )
            if cursor.fetchone():
                cursor.execute(
                    "DELETE FROM messages WHERE session_id = ?",
                    (session_id,)
                )
                conn.commit()
                conn.close()
                return True
            conn.close()
            return False
        except Exception as e:
            print(f"Error deleting session messages: {e}")
            return False

    # Student management methods
    def add_student(self, student_id: str, name: str, department: str, email: str) -> bool:
        """Add a new student"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO students (id, name, department, email) VALUES (?, ?, ?, ?)",
                (student_id, name, department, email)
            )
            cursor.execute(
                "INSERT INTO activity_logs (student_id, activity) VALUES (?, ?)",
                (student_id, "Student registered")
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error adding student: {e}")
            return False
    
    def get_student(self, student_id: str) -> Optional[Dict]:
        """Get student by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            columns = ["id", "name", "department", "email", "created_at", "last_active", "is_active"]
            return dict(zip(columns, row))
        return None
    
    def update_student(self, student_id: str, field: str, new_value: str) -> bool:
        """Update student field"""
        allowed_fields = ["name", "department", "email"]
        if field not in allowed_fields:
            return False
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                f"UPDATE students SET {field} = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?",
                (new_value, student_id)
            )
            cursor.execute(
                "INSERT INTO activity_logs (student_id, activity) VALUES (?, ?)",
                (student_id, f"Updated {field}")
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error updating student: {e}")
            return False
    
    def delete_student(self, student_id: str) -> bool:
        """Delete student"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
            cursor.execute("DELETE FROM activity_logs WHERE student_id = ?", (student_id,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error deleting student: {e}")
            return False
    
    def list_students(self) -> List[Dict]:
        """List all students"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        columns = ["id", "name", "department", "email", "created_at", "last_active", "is_active"]
        return [dict(zip(columns, row)) for row in rows]
    
    def get_campus_analytics(self) -> Dict[str, Any]:
        """Get comprehensive campus analytics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Total students
        cursor.execute("SELECT COUNT(*) FROM students")
        total_students = cursor.fetchone()[0]
        
        # Students by department
        cursor.execute("SELECT department, COUNT(*) FROM students GROUP BY department")
        dept_breakdown = dict(cursor.fetchall())
        
        # Recent students (last 7 days)
        cursor.execute("SELECT COUNT(*) FROM students WHERE created_at > datetime('now', '-7 days')")
        recent_students = cursor.fetchone()[0]
        
        # Active students (last 7 days)
        cursor.execute("""
            SELECT COUNT(DISTINCT student_id) 
            FROM activity_logs 
            WHERE timestamp > datetime('now', '-7 days')
        """)
        active_students = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "total_students": total_students,
            "department_breakdown": dept_breakdown,
            "recent_enrollments": recent_students,
            "active_last_7_days": active_students,
            "activity_rate": round((active_students / max(total_students, 1)) * 100, 2)
        }

class JWTManager:
    """JWT token management"""
    
    def __init__(self, secret_key: str = None):
        self.secret_key ="c87e782122905af624194b0652d0701c"
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
    
    def create_access_token(self, data: dict) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.exceptions.PyJWTError:
            return None