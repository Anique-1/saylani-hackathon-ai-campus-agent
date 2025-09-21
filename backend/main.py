import uuid
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
import os
from datetime import datetime
from dotenv import load_dotenv

from models import DatabaseManager, JWTManager
from unified_agent import UnifiedCampusAgent
from langchain.schema import HumanMessage

# Load environment variables
load_dotenv()

app = FastAPI(
    title="NUST Campus Administration API",
    description="Unified AI-powered agent for campus administration and NUST University information",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
agent = None
db_manager = None
jwt_manager = JWTManager()
security = HTTPBearer()

# Pydantic models
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_info: Dict[str, Any]

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str

class MessageSave(BaseModel):
    session_id: str
    user_id: int
    message_type: str
    content: str

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    token = credentials.credentials
    payload = jwt_manager.verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db_manager.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

# Startup event
@app.on_event("startup")
async def startup_event():
    global agent, db_manager
    
    print("🚀 Starting NUST Campus Administration API...")
    
    # Initialize database
    db_manager = DatabaseManager()
    
    # Initialize unified agent
    try:
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            agent = UnifiedCampusAgent(gemini_api_key)
            print("✅ Unified Campus Agent initialized successfully")
        else:
            print("⚠️ GEMINI_API_KEY not found. Agent will not be available.")
            agent = None
    except Exception as e:
        print(f"❌ Failed to initialize agent: {e}")
        agent = None

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "NUST Campus Administration API",
        "version": "3.0.0",
        "status": "healthy",
        "agent_status": "initialized" if agent else "not initialized",
        "features": [
            "User authentication (login/register)",
            "Campus administration via AI chat",
            "NUST University information",
            "Student management",
            "Analytics and reporting",
            "Session management",
            "Email notifications"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "agent": agent is not None,
        "database": db_manager is not None,
        "timestamp": datetime.now().isoformat()
    }

# Authentication endpoints
@app.post("/auth/register", response_model=TokenResponse)
async def register_user(user_data: UserRegister):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = db_manager.verify_user(user_data.username, "dummy_password")
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Create user
        success = db_manager.create_user(
            user_data.username, 
            user_data.email, 
            user_data.password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Login the user automatically
        user = db_manager.verify_user(user_data.username, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User created but login failed"
            )
        
        # Create access token
        token_data = {"user_id": user["id"], "username": user["username"]}
        access_token = jwt_manager.create_access_token(token_data)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_info={
                "id": user["id"],
                "username": user["username"],
                "email": user["email"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )

@app.post("/auth/login", response_model=TokenResponse)
async def login_user(user_data: UserLogin):
    """Login user and return access token"""
    try:
        # Verify user credentials
        user = db_manager.verify_user(user_data.username, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Create access token
        token_data = {"user_id": user["id"], "username": user["username"]}
        access_token = jwt_manager.create_access_token(token_data)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_info={
                "id": user["id"],
                "username": user["username"],
                "email": user["email"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )

@app.get("/auth/me")
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "user": current_user,
        "authenticated": True
    }

# Chat endpoints (protected)
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, current_user: Dict = Depends(get_current_user)):
    """Chat with the unified campus agent"""
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent not initialized. Please check GEMINI_API_KEY configuration."
        )
    
    try:
        # Save user message to database first
        if request.session_id:
            db_manager.save_message(request.session_id, current_user["id"], "user", request.message)
        
        # Get response from agent
        response = await agent.chat(request.message, request.session_id)
        
        # Save AI response to database
        if response.get("session_id"):
            db_manager.save_message(response["session_id"], current_user["id"], "ai", response["response"])
        
        return ChatResponse(
            response=response["response"],
            session_id=response["session_id"],
            timestamp=response["timestamp"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat error: {str(e)}"
        )

@app.post("/chat/stream")
async def stream_chat_endpoint(request: ChatRequest, current_user: Dict = Depends(get_current_user)):
    """Stream chat responses from the unified agent with true word-by-word streaming"""
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent not initialized. Please check GEMINI_API_KEY configuration."
        )
    
    async def event_generator():
        try:
            # Save user message to database first
            if request.session_id:
                db_manager.save_message(request.session_id, current_user["id"], "user", request.message)
            
            full_response = ""
            session_id = request.session_id or str(uuid.uuid4())
            
            # Check if this is a campus admin task that needs tool execution
            admin_keywords = ["add student", "delete student", "update student", "list students", 
                            "student info", "campus analytics", "statistics"]
            
            if any(keyword in request.message.lower() for keyword in admin_keywords):
                # For admin tasks, use the full graph processing but simulate streaming
                response = await agent.chat(request.message, request.session_id)
                full_response = response["response"]
                session_id = response["session_id"]
                
                # True word-by-word streaming simulation
                words = full_response.split()
                current_text = ""
                
                for i, word in enumerate(words):
                    current_text += word
                    if i < len(words) - 1:
                        current_text += " "
                    
                    progress = ((i + 1) / len(words)) * 100
                    
                    yield f"data: {json.dumps({\
                        'event': 'message',\
                        'data': {\
                            'response': current_text,\
                            'session_id': session_id,\
                            'timestamp': datetime.now().isoformat(),\
                            'progress': progress,\
                            'word_count': i + 1,\
                            'total_words': len(words)\
                        }\
                    })}\n\n"
                    
                    # Small delay between words for visible streaming effect
                    await asyncio.sleep(0.03)
            
            else:
                # For general queries, use direct LLM streaming if available
                try:
                    # Get context for the query
                    context = agent._get_context(request.message) if hasattr(agent, '_get_context') else ""
                    history = []
                    
                    if request.session_id and request.session_id in agent.sessions:
                        history = agent.sessions[request.session_id].get("conversation_history", [])
                    
                    # Build prompt
                    prompt = agent._build_prompt(request.message, context, history) if hasattr(agent, '_build_prompt') else request.message
                    
                    # Try to use streaming if available
                    if hasattr(agent.llm, 'astream'):
                        # True streaming from LLM
                        messages = [HumanMessage(content=prompt)]
                        word_buffer = ""
                        word_count = 0
                        
                        async for chunk in agent.llm.astream(messages):
                            if hasattr(chunk, 'content') and chunk.content:
                                full_response += chunk.content
                                word_buffer += chunk.content
                                
                                # Check for word boundaries (space, punctuation)
                                if ' ' in word_buffer or any(p in word_buffer for p in '.!?;,\n'):
                                    word_count += len(word_buffer.split())
                                    
                                    yield f"data: {json.dumps({\
                                        'event': 'message',\
                                        'data': {\
                                            'response': full_response,\
                                            'session_id': session_id,\
                                            'timestamp': datetime.now().isoformat(),\
                                            'progress': min(95, word_count * 2),\
                                            'streaming': True\
                                        }\
                                    })}\n\n"
                                    
                                    word_buffer = ""
                                    await asyncio.sleep(0.01)  # Very small delay
                                else:
                                    # Send character-by-character for smooth streaming
                                    yield f"data: {json.dumps({\
                                        'event': 'message',\
                                        'data': {\
                                            'response': full_response,\
                                            'session_id': session_id,\
                                            'timestamp': datetime.now().isoformat(),\
                                            'progress': min(95, len(full_response) * 0.5),\
                                            'streaming': True\
                                        }\
                                    })}\n\n"
                    else:
                        # Fallback: Get complete response and simulate streaming
                        response = await agent.chat(request.message, request.session_id)
                        full_response = response["response"]
                        session_id = response["session_id"]
                        
                        # Character-by-character streaming for smoother effect
                        current_text = ""
                        for i, char in enumerate(full_response):
                            current_text += char
                            progress = ((i + 1) / len(full_response)) * 100
                            
                            # Only yield on word boundaries or every few characters
                            if char in ' \n.!?;,' or i % 3 == 0 or i == len(full_response) - 1:
                                yield f"data: {json.dumps({\
                                    'event': 'message',\
                                    'data': {\
                                        'response': current_text,\
                                        'session_id': session_id,\
                                        'timestamp': datetime.now().isoformat(),\
                                        'progress': progress,\
                                        'char_count': i + 1,\
                                        'total_chars': len(full_response)\
                                    }\
                                })}\n\n"
                                
                                await asyncio.sleep(0.01)  # Very fast streaming
                
                except Exception as e:
                    full_response = f"I apologize, but I encountered an error: {str(e)}"
                    
                    # Stream the error message
                    for i, char in enumerate(full_response):
                        current_text = full_response[:i+1]
                        yield f"data: {json.dumps({\
                            'event': 'message',\
                            'data': {\
                                'response': current_text,\
                                'session_id': session_id,\
                                'timestamp': datetime.now().isoformat(),\
                                'progress': ((i + 1) / len(full_response)) * 100,\
                                'error': True\
                            }\
                        })}\n\n"
                        await asyncio.sleep(0.02)
            
            # Save complete AI response to database
            if session_id and full_response:
                db_manager.save_message(session_id, current_user["id"], "ai", full_response)
            
            # Send completion signal
            yield f"data: {json.dumps({\
                'event': 'complete',\
                'data': {\
                    'response': full_response,\
                    'session_id': session_id,\
                    'timestamp': datetime.now().isoformat(),\
                    'progress': 100,\
                    'complete': True\
                }\
            })}\n\n"
            
        except Exception as e:
            print(f"Streaming error: {e}")
            yield f"data: {json.dumps({\
                'event': 'error',\
                'data': {'error': str(e)}\
            })}\n\n"
    
    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

# Message endpoints (protected)
@app.post("/messages")
async def save_message(message_data: MessageSave, current_user: Dict = Depends(get_current_user)):
    """Save a message to the database"""
    try:
        # Verify session belongs to user
        session = db_manager.get_session(message_data.session_id)
        if not session or session["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Session not found or access denied"
            )
        
        success = db_manager.save_message(
            message_data.session_id,
            current_user["id"],
            message_data.message_type,
            message_data.content
        )
        
        if success:
            return {"success": True, "message": "Message saved successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save message"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving message: {str(e)}"
        )

@app.get("/messages/{session_id}")
async def get_session_messages(session_id: str, current_user: Dict = Depends(get_current_user)):
    """Get all messages for a session"""
    try:
        messages = db_manager.get_session_messages(session_id, current_user["id"])
        return {
            "success": True,
            "session_id": session_id,
            "messages": messages
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving messages: {str(e)}"
        )

# Analytics endpoints (protected)
@app.get("/analytics/overview")
async def get_analytics_overview(current_user: Dict = Depends(get_current_user)):
    """Get comprehensive campus analytics overview"""
    try:
        analytics = db_manager.get_campus_analytics()
        return {
            "success": True,
            "analytics": analytics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics error: {str(e)}"
        )

@app.get("/analytics/students")
async def get_student_analytics(current_user: Dict = Depends(get_current_user)):
    """Get detailed student analytics"""
    try:
        students = db_manager.list_students()
        
        # Calculate additional metrics
        total_students = len(students)
        departments = {}
        
        for student in students:
            dept = student.get("department", "Unknown")
            departments[dept] = departments.get(dept, 0) + 1
        
        return {
            "success": True,
            "total_students": total_students,
            "department_breakdown": departments,
            "students": students,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Student analytics error: {str(e)}"
        )

@app.get("/analytics/departments")
async def get_department_analytics(current_user: Dict = Depends(get_current_user)):
    """Get department-wise analytics"""
    try:
        students = db_manager.list_students()
        
        department_stats = {}
        for student in students:
            dept = student.get("department", "Unknown")
            if dept not in department_stats:
                department_stats[dept] = {
                    "name": dept,
                    "total_students": 0,
                    "students": []
                }
            department_stats[dept]["total_students"] += 1
            department_stats[dept]["students"].append({
                "id": student["id"],
                "name": student["name"],
                "email": student["email"]
            })
        
        return {
            "success": True,
            "departments": list(department_stats.values()),
            "total_departments": len(department_stats),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Department analytics error: {str(e)}"
        )

# Student management endpoints (protected)
@app.get("/students")
async def list_students(current_user: Dict = Depends(get_current_user)):
    """List all students"""
    try:
        students = db_manager.list_students()
        return {
            "success": True,
            "total_count": len(students),
            "students": students
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing students: {str(e)}"
        )

@app.get("/students/{student_id}")
async def get_student(student_id: str, current_user: Dict = Depends(get_current_user)):
    """Get student by ID"""
    try:
        student = db_manager.get_student(student_id)
        if student:
            return {
                "success": True,
                "student": student
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {student_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving student: {str(e)}"
        )

# Session management endpoints
@app.get("/sessions")
async def list_sessions(current_user: Dict = Depends(get_current_user)):
    """List all chat sessions for the current user"""
    try:
        sessions = db_manager.get_user_sessions(current_user["id"])
        formatted_sessions = []
        
        for session in sessions:
            formatted_sessions.append({
                "session_id": session["session_id"],
                "user_id": current_user["id"],
                "created_at": session["created_at"],
                "last_activity": session.get("last_activity", session["created_at"]),
                "message_count": session.get("message_count", 0)
            })
        
        return {
            "success": True,
            "sessions": formatted_sessions
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing sessions: {str(e)}"
        )

@app.post("/sessions")
async def create_chat_session(current_user: Dict = Depends(get_current_user)):
    """Create a new chat session"""
    try:
        # Generate session ID
        import uuid
        session_id = str(uuid.uuid4())
        
        # Create session in database
        success = db_manager.create_session(session_id, current_user["id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
        
        # Also create session in agent if available
        if agent:
            agent.create_session(str(current_user["id"]), session_id)
        
        return {
            "success": True,
            "session_id": session_id,
            "user_id": current_user["id"],
            "created_at": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Session creation error: {str(e)}"
        )

@app.get("/sessions/{session_id}")
async def get_session_info(session_id: str, current_user: Dict = Depends(get_current_user)):
    """Get session information"""
    try:
        session = db_manager.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Verify session belongs to user
        if session["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get message count
        messages = db_manager.get_session_messages(session_id, current_user["id"])
        
        return {
            "success": True,
            "session_id": session_id,
            "user_id": session["user_id"],
            "created_at": session["created_at"],
            "last_activity": session["last_activity"],
            "message_count": len(messages)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving session: {str(e)}"
        )

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete a chat session"""
    try:
        session = db_manager.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Only allow the user who owns the session to delete it
        if session["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this session"
            )
        
        # Delete session from database
        success = db_manager.delete_session(session_id, current_user["id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete session"
            )
        
        # Also remove from agent if available
        if agent and session_id in agent.sessions:
            del agent.sessions[session_id]
        
        return {
            "success": True,
            "message": f"Session {session_id} deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting session: {str(e)}"
        )

# Demo and info endpoints (public)
@app.get("/info")
async def get_system_info():
    """Get system information and capabilities"""
    return {
        "system": "NUST Campus Administration API",
        "version": "3.0.0",
        "capabilities": {
            "authentication": {
                "description": "JWT-based user authentication",
                "endpoints": ["/auth/register", "/auth/login", "/auth/me"]
            },
            "chat_interface": {
                "description": "AI-powered conversational interface for campus admin and NUST info",
                "endpoints": ["/chat", "/chat/stream"],
                "features": [
                    "Natural language student management",
                    "NUST University information queries",
                    "Session management",
                    "Real-time streaming responses"
                ]
            },
            "analytics": {
                "description": "Comprehensive analytics and reporting",
                "endpoints": ["/analytics/overview", "/analytics/students", "/analytics/departments"],
                "features": [
                    "Campus statistics",
                    "Department breakdowns",
                    "Student activity metrics"
                ]
            },
            "student_management": {
                "description": "Direct student management through chat interface",
                "operations": [
                    "Add students with automatic welcome emails",
                    "Update student information with notifications",
                    "Delete students (no email notifications)",
                    "Search and filter students",
                    "View comprehensive student profiles"
                ]
            }
        },
        "nust_info": {
            "description": "NUST University information system",
            "features": [
                "RAG-based knowledge retrieval",
                "Web search integration for current information",
                "Comprehensive university information database"
            ]
        },
        "getting_started": {
            "step_1": "Register: POST /auth/register",
            "step_2": "Login: POST /auth/login",
            "step_3": "Create session: POST /sessions", 
            "step_4": "Start chatting: POST /chat",
            "example_queries": [
                "Add student Ali Ahmed to Computer Science with email ali@nust.edu.pk",
                "Show me campus analytics",
                "What is NUST University?",
                "Update student STU001 email to newemail@nust.edu.pk",
                "Tell me about NUST admissions process"
            ]
        }
    }

@app.get("/demo")
async def get_demo_commands():
    """Get demo commands for testing the system"""
    return {
        "demo_commands": {
            "authentication": {
                "register": {
                    "endpoint": "POST /auth/register",
                    "body": {
                        "username": "testuser",
                        "email": "test@nust.edu.pk",
                        "password": "password123"
                    }
                },
                "login": {
                    "endpoint": "POST /auth/login", 
                    "body": {
                        "username": "testuser",
                        "password": "password123"
                    }
                }
            },
            "campus_administration": [
                "Add student Hassan Ali to Engineering with email hassan@nust.edu.pk",
                "Show me student STU001 information",
                "Update student STU002 department to Computer Science",
                "Delete student STU003",
                "List all students in Mathematics department",
                "Show me campus statistics",
                "Get analytics for all departments"
            ],
            "nust_information": [
                "What is NUST University?",
                "Tell me about NUST admissions process",
                "What schools does NUST have?",
                "How do I apply to NUST?",
                "What facilities does NUST offer?",
                "Tell me about NUST research programs"
            ],
            "general_queries": [
                "Hello, what can you help me with?",
                "Show me all available commands",
                "How do I manage students?",
                "What analytics are available?"
            ]
        },
        "testing_flow": {
            "step_1": "Register or login to get access token",
            "step_2": "Use token in Authorization header: 'Bearer <token>'",
            "step_3": "Create a chat session: POST /sessions",
            "step_4": "Start chatting with natural language commands",
            "step_5": "Check analytics: GET /analytics/overview"
        },
        "note": "All protected endpoints require authentication. Register or login to get your access token."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
    )