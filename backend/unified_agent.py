import os
import json
import asyncio
from typing import Dict, List, Any, Optional, AsyncGenerator
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from typing_extensions import Annotated, TypedDict
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langchain_core.documents import Document
from datetime import datetime
from duckduckgo_search import DDGS
import uuid

from models import DatabaseManager
from email_service import EmailService

# State definition for the unified agent
class UnifiedAgentState(TypedDict):
    messages: Annotated[list, add_messages]
    query: str
    context: str
    web_search_results: List[Dict]
    rag_results: List[Document]
    operation_type: str  # 'nust_info', 'campus_admin', 'general'
    final_answer: str
    session_id: str
    user_context: Dict[str, Any]

class NUSTRAGSystem:
    """RAG system for NUST University information"""
    
    def __init__(self):
        self.json_docs = []
        self._load_json_data()

    def _load_json_data(self):
        """Load university data from nust_scraped_data.json"""
        try:
            # Try multiple possible paths for the NUST data file
            possible_paths = [
                "project/backend/nust_scraped_data.json",
                "../nust_scraped_data.json",
                "./data/nust_scraped_data.json",
                "nust_scraped_data.json"
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    self.json_docs = [
                        Document(
                            page_content=entry.get("content", ""),
                            metadata=entry.get("metadata", {})
                        )
                        for entry in data
                    ]
                    print(f"Loaded {len(self.json_docs)} NUST documents from {path}")
                    return
            
            # If no file found, create some basic NUST information
            print("NUST data file not found, using basic information")
            self._create_basic_nust_data()
            
        except Exception as e:
            print(f"Could not load NUST JSON data: {str(e)}")
            self._create_basic_nust_data()

    def _create_basic_nust_data(self):
        """Create basic NUST information if file not found"""
        basic_nust_info = [
            {
                "content": "NUST (National University of Sciences and Technology) is a premier technological university in Pakistan located in Islamabad. It was established in 1991 and offers undergraduate, graduate, and doctoral programs in engineering, sciences, and technology.",
                "metadata": {"title": "NUST Overview", "source": "basic"}
            },
            {
                "content": "NUST has multiple schools including School of Electrical Engineering and Computer Science (SEECS), School of Mechanical and Manufacturing Engineering (SMME), School of Civil and Environmental Engineering (SCEE), School of Chemical and Materials Engineering (SCME), and School of Natural Sciences (SNS).",
                "metadata": {"title": "NUST Schools", "source": "basic"}
            },
            {
                "content": "NUST admission is through NET (NUST Entry Test) conducted annually. The university offers scholarships and financial aid to deserving students. Campus facilities include hostels, cafeteria, library, sports complex, and medical center.",
                "metadata": {"title": "NUST Admissions and Facilities", "source": "basic"}
            },
            {
                "content": "NUST is known for its research excellence and industry partnerships. It has collaborations with international universities and offers exchange programs. The university emphasizes innovation and entrepreneurship.",
                "metadata": {"title": "NUST Research and Partnerships", "source": "basic"}
            }
        ]
        
        self.json_docs = [
            Document(
                page_content=info["content"],
                metadata=info["metadata"]
            )
            for info in basic_nust_info
        ]

    def retrieve_context(self, query: str) -> List[Document]:
        """Retrieve relevant context for query from NUST data"""
        results = []
        
        if self.json_docs:
            keywords = query.lower().split()
            scored_docs = []
            
            for doc in self.json_docs:
                content = doc.page_content.lower()
                title = str(doc.metadata.get("title", "")).lower()
                
                # Calculate relevance score
                score = 0
                for keyword in keywords:
                    if keyword in content:
                        score += content.count(keyword)
                    if keyword in title:
                        score += title.count(keyword) * 2
                
                if score > 0:
                    scored_docs.append((doc, score))
            
            # Sort by score and return top 3
            scored_docs.sort(key=lambda x: x[1], reverse=True)
            results = [doc for doc, score in scored_docs[:3]]
        
        return results

class WebSearchTool:
    """Web search tool using DuckDuckGo"""
    
    def __init__(self):
        try:
            self.ddgs = DDGS()
        except Exception as e:
            print(f"Warning: Could not initialize web search: {e}")
            self.ddgs = None

    def search(self, query: str, max_results: int = 3) -> List[Dict]:
        """Search web for information"""
        if not self.ddgs:
            return [{
                "title": "Search Unavailable",
                "snippet": "Web search is currently unavailable",
                "url": "",
                "source": "Error"
            }]
        
        try:
            nust_query = f"NUST University Pakistan {query}" if "nust" in query.lower() else query
            results = []
            
            search_results = self.ddgs.text(nust_query, max_results=max_results)
            
            for result in search_results:
                results.append({
                    "title": result.get("title", ""),
                    "snippet": result.get("body", ""),
                    "url": result.get("href", ""),
                    "source": "DuckDuckGo"
                })
            
            return results
            
        except Exception as e:
            return [{
                "title": "Search Error",
                "snippet": f"Could not perform web search: {str(e)}",
                "url": "",
                "source": "Error"
            }]

class UnifiedCampusAgent:
    """Unified agent handling both campus administration and NUST information"""
    
    def __init__(self, gemini_api_key: str = None):
        self.gemini_api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not found! Please set it in environment variables.")
        
        # Initialize components
        self.db = DatabaseManager()
        self.email_service = EmailService()
        self.nust_rag = NUSTRAGSystem()
        self.web_search = WebSearchTool()
        
        # Initialize LLM
        try:
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=self.gemini_api_key,
                temperature=0.7
            )
            print("✅ Gemini LLM initialized successfully")
        except Exception as e:
            raise ValueError(f"Failed to initialize Gemini LLM: {e}")
        
        # Create tools and graph
        self.tools = self._create_tools()
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        self.graph = self._create_graph()
        
        # Session management - Fixed to prevent duplicates
        self.sessions = {}
        
        print("✅ Unified Campus Agent initialized successfully!")

    def create_session(self, user_id: str, session_id: str = None) -> str:
        """Create a new chat session for a user and return the session_id."""
        # If session_id is provided and already exists, return it
        if session_id and session_id in self.sessions:
            return session_id
            
        # If no session_id provided, generate a new one
        if not session_id:
            session_id = str(uuid.uuid4())
            
        # Create new session only if it doesn't exist
        if session_id not in self.sessions:
            now = datetime.now()
            self.sessions[session_id] = {
                "session_id": session_id,
                "user_id": user_id,
                "created_at": now,
                "last_activity": now,
                "conversation_history": []
            }
        
        return session_id

    def get_session_info(self, session_id: str) -> Optional[dict]:
        """Retrieve session info by session_id."""
        return self.sessions.get(session_id)
    
    def _create_tools(self):
        """Create tools for campus administration"""
        
        @tool
        def add_student_tool(name: str, student_id: str, department: str, email: str) -> str:
            """Add a new student to the campus database with automatic welcome email."""
            try:
                success = self.db.add_student(student_id, name, department, email)
                if success:
                    # Send welcome email
                    try:
                        email_result = self.email_service.send_welcome_email(
                            student_id, email, name, department, email
                        )
                        return json.dumps({
                            "success": True,
                            "message": f"Student {name} (ID: {student_id}) added successfully",
                            "email_sent": email_result["success"],
                            "email_status": email_result["message"]
                        })
                    except Exception as e:
                        return json.dumps({
                            "success": True,
                            "message": f"Student {name} added but email failed: {str(e)}"
                        })
                else:
                    return json.dumps({
                        "success": False,
                        "message": "Failed to add student. ID or email might already exist."
                    })
            except Exception as e:
                return json.dumps({"error": f"Failed to add student: {str(e)}"})
        
        @tool
        def get_student_info(student_id: str) -> str:
            """Get detailed student information by student ID."""
            try:
                student = self.db.get_student(student_id)
                if student:
                    return json.dumps({
                        "success": True,
                        "student": student
                    })
                else:
                    return json.dumps({
                        "success": False,
                        "message": f"Student with ID {student_id} not found"
                    })
            except Exception as e:
                return json.dumps({"error": f"Failed to get student: {str(e)}"})
        
        @tool
        def update_student_info(student_id: str, field: str, new_value: str) -> str:
            """Update student information. Allowed fields: name, department, email."""
            try:
                # Get original student info
                student = self.db.get_student(student_id)
                if not student:
                    return json.dumps({
                        "success": False,
                        "message": f"Student with ID {student_id} not found"
                    })
                
                old_value = student.get(field, "N/A")
                success = self.db.update_student(student_id, field, new_value)
                
                if success:
                    # Send update notification
                    try:
                        email_result = self.email_service.send_update_notification(
                            student_id, student["email"], student["name"],
                            field, str(old_value), new_value
                        )
                        return json.dumps({
                            "success": True,
                            "message": f"Student {student_id} {field} updated to '{new_value}'",
                            "email_sent": email_result["success"]
                        })
                    except Exception as e:
                        return json.dumps({
                            "success": True,
                            "message": f"Student updated but notification failed: {str(e)}"
                        })
                else:
                    return json.dumps({
                        "success": False,
                        "message": f"Failed to update {field}. Invalid field name."
                    })
            except Exception as e:
                return json.dumps({"error": f"Failed to update student: {str(e)}"})
        
        @tool
        def delete_student_tool(student_id: str) -> str:
            """Delete a student from the database (no email notification sent)."""
            try:
                student = self.db.get_student(student_id)
                if not student:
                    return json.dumps({
                        "success": False,
                        "message": f"Student with ID {student_id} not found"
                    })
                
                success = self.db.delete_student(student_id)
                if success:
                    return json.dumps({
                        "success": True,
                        "message": f"Student {student_id} deleted successfully (No email notification sent)",
                        "email_sent": False
                    })
                else:
                    return json.dumps({
                        "success": False,
                        "message": "Failed to delete student"
                    })
            except Exception as e:
                return json.dumps({"error": f"Failed to delete student: {str(e)}"})
        
        @tool
        def list_all_students() -> str:
            """Get a list of all students in the database."""
            try:
                students = self.db.list_students()
                return json.dumps({
                    "success": True,
                    "total_count": len(students),
                    "students": students
                })
            except Exception as e:
                return json.dumps({"error": f"Failed to list students: {str(e)}"})
        
        @tool
        def get_campus_analytics() -> str:
            """Get comprehensive campus statistics and analytics."""
            try:
                analytics = self.db.get_campus_analytics()
                return json.dumps({
                    "success": True,
                    "analytics": analytics,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                return json.dumps({"error": f"Failed to get analytics: {str(e)}"})
        
        return [
            add_student_tool, get_student_info, update_student_info,
            delete_student_tool, list_all_students, get_campus_analytics
        ]
    
    def _create_graph(self):
        """Create the LangGraph workflow"""
        
        def should_continue(state: UnifiedAgentState) -> str:
            """Decide whether to continue with tool calls or end"""
            last_message = state["messages"][-1]
            if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                return "tools"
            return END
        
        def classify_query(state: UnifiedAgentState) -> UnifiedAgentState:
            """Classify the type of query"""
            query = state["query"].lower()
            
            # Check for NUST-related queries
            nust_keywords = ["nust", "national university", "sciences technology", "islamabad university"]
            
            # Check for campus admin queries
            admin_keywords = ["add student", "delete student", "update student", "list students", 
                            "student info", "campus analytics", "statistics"]
            
            if any(keyword in query for keyword in nust_keywords):
                state["operation_type"] = "nust_info"
            elif any(keyword in query for keyword in admin_keywords):
                state["operation_type"] = "campus_admin"
            else:
                state["operation_type"] = "general"
            
            return state
        
        def handle_nust_query(state: UnifiedAgentState) -> UnifiedAgentState:
            """Handle NUST University information queries"""
            query = state["query"]
            
            # Get RAG context
            rag_docs = self.nust_rag.retrieve_context(query)
            context = "\n".join([doc.page_content for doc in rag_docs]) if rag_docs else ""
            
            # Get web search results for current info
            web_results = self.web_search.search(query)
            web_context = ""
            if web_results:
                web_context = "\n\nRecent information:\n"
                for result in web_results:
                    web_context += f"- {result['title']}: {result['snippet']}\n"
            
            # Generate response
            system_prompt = """You are a helpful assistant specializing in NUST University (National University of Sciences and Technology) information. 
            Use the provided context to answer questions about NUST University accurately and comprehensively.
            If you don't have specific information, be honest about it.
            Focus only on NUST University-related information."""
            
            messages = [
                HumanMessage(content=f"""
                System: {system_prompt}
                
                Question: {query}
                
                NUST Knowledge Base Context:
                {context}
                
                {web_context}
                
                Please provide a comprehensive answer about NUST University based on the available information.
                """)
            ]
            
            try:
                response = self.llm.invoke(messages)
                state["final_answer"] = response.content
            except Exception as e:
                state["final_answer"] = f"I apologize, but I encountered an error while processing your NUST query: {str(e)}"
            
            return state
        
        def call_model(state: UnifiedAgentState) -> Dict[str, Any]:
            """Call the LLM with tools for campus admin queries"""
            messages = state["messages"]
            
            system_message = """You are an intelligent Campus Administration Agent with access to student management tools and NUST University information. You can help with:

CAMPUS ADMINISTRATION:
- Add new students with automatic welcome emails
- View and search student information
- Update student details with notification emails
- Delete student accounts (no email notifications for deletions)
- Get comprehensive campus analytics and statistics

NUST UNIVERSITY INFORMATION:
- Answer questions about NUST University
- Provide information about admissions, programs, facilities
- Share details about schools, departments, and courses

IMPORTANT POLICIES:
- Student deletions do NOT send email notifications (this is intentional for privacy)
- Only student additions and updates trigger automatic emails
- Always be helpful, professional, and friendly
- Use the appropriate tools for campus admin tasks
- For NUST queries, provide comprehensive information

When users ask to perform campus admin actions, use the appropriate tools and confirm success.
For NUST information queries, provide detailed and helpful responses."""
            
            # Add system message to the beginning
            full_messages = [HumanMessage(content=system_message)] + messages
            
            try:
                response = self.llm_with_tools.invoke(full_messages)
                return {"messages": [response]}
            except Exception as e:
                error_response = AIMessage(content=f"I encountered an error: {str(e)}")
                return {"messages": [error_response]}
        
        def call_tools(state: UnifiedAgentState) -> Dict[str, Any]:
            """Execute tool calls"""
            last_message = state["messages"][-1]
            tool_responses = []
            
            for tool_call in last_message.tool_calls:
                try:
                    # Find and execute the tool
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    
                    # Execute the tool
                    for tool in self.tools:
                        if tool.name == tool_name:
                            result = tool.invoke(tool_args)
                            tool_responses.append(
                                ToolMessage(
                                    content=result,
                                    tool_call_id=tool_call["id"]
                                )
                            )
                            break
                except Exception as e:
                    tool_responses.append(
                        ToolMessage(
                            content=f"Error executing {tool_call['name']}: {str(e)}",
                            tool_call_id=tool_call["id"]
                        )
                    )
            
            return {"messages": tool_responses}
        
        # Build the graph
        workflow = StateGraph(UnifiedAgentState)
        
        # Add nodes
        workflow.add_node("classify", classify_query)
        workflow.add_node("nust_handler", handle_nust_query)
        workflow.add_node("agent", call_model)
        workflow.add_node("tools", call_tools)
        
        # Set entry point
        workflow.set_entry_point("classify")
        
        # Add conditional edges
        workflow.add_conditional_edges(
            "classify",
            lambda state: "nust_handler" if state["operation_type"] == "nust_info" else "agent"
        )
        
        workflow.add_edge("nust_handler", END)
        workflow.add_conditional_edges("agent", should_continue)
        workflow.add_edge("tools", "agent")
        
        return workflow.compile()
    
    def _get_context(self, message: str) -> str:
        """Get relevant context for the message"""
        # Check if it's NUST related
        if any(keyword in message.lower() for keyword in ["nust", "national university", "sciences technology"]):
            rag_docs = self.nust_rag.retrieve_context(message)
            return "\n".join([doc.page_content for doc in rag_docs])
        return ""
    
    def _build_prompt(self, message: str, context: str, history: List[Dict]) -> str:
        """Build the complete prompt for generation"""
        system_prompt = """You are an intelligent Campus Administration Agent with access to student management tools and NUST University information. You can help with:

CAMPUS ADMINISTRATION:
- Add new students with automatic welcome emails
- View and search student information  
- Update student details with notification emails
- Delete student accounts (no email notifications for deletions)
- Get comprehensive campus analytics and statistics

NUST UNIVERSITY INFORMATION:
- Answer questions about NUST University
- Provide information about admissions, programs, facilities
- Share details about schools, departments, and courses

Always be helpful, professional, and friendly. Provide detailed and informative responses."""
        
        # Build conversation history
        history_text = ""
        if history:
            for msg in history[-6:]:  # Last 6 messages for context
                role = "User" if msg["role"] == "user" else "Assistant"
                history_text += f"{role}: {msg['content']}\n"
        
        # Add context if available
        context_text = f"\nRelevant Context:\n{context}\n" if context else ""
        
        full_prompt = f"""{system_prompt}

{context_text}
Conversation History:
{history_text}

User: {message}
Assistant: """
        
        return full_prompt.strip()
    
    async def chat(self, message: str, session_id: str = None) -> Dict[str, Any]:
        """Main chat interface"""
        try:
            # Create or retrieve session - Fixed duplicate logic
            if not session_id:
                session_id = str(uuid.uuid4())
            
            # Only create session if it doesn't exist
            if session_id not in self.sessions:
                self.create_session("default_user", session_id)
            
            # Update session activity
            self.sessions[session_id]["last_activity"] = datetime.now()
            
            # Prepare initial state
            initial_state = UnifiedAgentState(
                messages=[HumanMessage(content=message)],
                query=message,
                context="",
                web_search_results=[],
                rag_results=[],
                operation_type="",
                final_answer="",
                session_id=session_id,
                user_context={}
            )
            
            # Run the graph
            result = self.graph.invoke(initial_state)
            
            # Get the final response
            if result.get("final_answer"):
                response_content = result["final_answer"]
            else:
                # Get the last AI message
                for msg in reversed(result["messages"]):
                    if isinstance(msg, AIMessage):
                        response_content = msg.content
                        break
                else:
                    response_content = "I'm sorry, I couldn't process your request properly."
            
            # Store conversation history
            self.sessions[session_id]["conversation_history"].extend([
                {"role": "user", "content": message, "timestamp": datetime.now().isoformat()},
                {"role": "assistant", "content": response_content, "timestamp": datetime.now().isoformat()}
            ])
            
            return {
                "response": response_content,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            error_msg = f"I encountered an error while processing your request: {str(e)}"
            return {
                "response": error_msg,
                "session_id": session_id or str(uuid.uuid4()),
                "timestamp": datetime.now().isoformat()
            }

    async def stream_chat(self, message: str, session_id: str = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat responses with true word-by-word generation"""
        try:
            # Create or get session
            if not session_id:
                session_id = str(uuid.uuid4())
                
            if session_id not in self.sessions:
                self.create_session("default_user", session_id)
            
            # Update session activity
            self.sessions[session_id]["last_activity"] = datetime.now()
            
            # Add user message to history
            self.sessions[session_id]["conversation_history"].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.now().isoformat()
            })
            
            # Check if this is a campus admin task
            admin_keywords = ["add student", "delete student", "update student", "list students", 
                             "student info", "campus analytics", "statistics"]
            
            full_content = ""
            
            if any(keyword in message.lower() for keyword in admin_keywords):
                # For admin tasks, use the full graph processing
                try:
                    initial_state = UnifiedAgentState(
                        messages=[HumanMessage(content=message)],
                        query=message,
                        context="",
                        web_search_results=[],
                        rag_results=[],
                        operation_type="campus_admin",
                        final_answer="",
                        session_id=session_id,
                        user_context={}
                    )
                    
                    result = self.graph.invoke(initial_state)
                    
                    # Get the final response
                    if result.get("final_answer"):
                        full_content = result["final_answer"]
                    else:
                        for msg in reversed(result["messages"]):
                            if isinstance(msg, AIMessage):
                                full_content = msg.content
                                break
                        else:
                            full_content = "I'm sorry, I couldn't process your request properly."
                    
                    # Stream the response word by word
                    words = full_content.split()
                    current_text = ""
                    
                    for i, word in enumerate(words):
                        current_text += word + (" " if i < len(words) - 1 else "")
                        progress = ((i + 1) / len(words)) * 100
                        
                        yield {
                            "response": current_text,
                            "session_id": session_id,
                            "timestamp": datetime.now().isoformat(),
                            "progress": progress,
                            "complete": i == len(words) - 1
                        }
                        
                        # Small delay for visible streaming
                        await asyncio.sleep(0.04)
                    
                except Exception as e:
                    error_content = f"I encountered an error while processing your request: {str(e)}"
                    full_content = error_content
                    
                    # Stream error message
                    for i, char in enumerate(error_content):
                        current_text = error_content[:i+1]
                        progress = ((i + 1) / len(error_content)) * 100
                        
                        yield {
                            "response": current_text,
                            "session_id": session_id,
                            "timestamp": datetime.now().isoformat(),
                            "progress": progress,
                            "error": True,
                            "complete": i == len(error_content) - 1
                        }
                        
                        await asyncio.sleep(0.02)
            
            else:
                # For general queries, use direct LLM with enhanced streaming
                try:
                    # Get context and build prompt
                    context = self._get_context(message)
                    history = self.sessions[session_id]["conversation_history"]
                    full_prompt = self._build_prompt(message, context, history)
                    
                    # Try true streaming from Gemini
                    try:
                        messages = [HumanMessage(content=full_prompt)]
                        
                        # Check if Gemini supports streaming
                        if hasattr(self.llm, 'astream'):
                            # Use native streaming
                            chunk_count = 0
                            async for chunk in self.llm.astream(messages):
                                if hasattr(chunk, 'content') and chunk.content:
                                    full_content += chunk.content
                                    chunk_count += 1
                                    progress = min(90, chunk_count * 5)  # Estimate progress
                                    
                                    yield {
                                        "response": full_content,
                                        "session_id": session_id,
                                        "timestamp": datetime.now().isoformat(),
                                        "progress": progress,
                                        "streaming": True
                                    }
                                    
                                    # Small delay to prevent overwhelming
                                    await asyncio.sleep(0.01)
                            
                            # Final completion
                            yield {
                                "response": full_content,
                                "session_id": session_id,
                                "timestamp": datetime.now().isoformat(),
                                "progress": 100,
                                "complete": True
                            }
                            
                        else:
                            # Fallback: simulate streaming
                            response = await self.llm.ainvoke(messages)
                            full_content = response.content
                            
                            # Character-by-character streaming
                            current_text = ""
                            for i, char in enumerate(full_content):
                                current_text += char
                                progress = ((i + 1) / len(full_content)) * 100
                                
                                # Yield on word boundaries or every few characters
                                if char in ' \n.!?;,' or i % 2 == 0 or i == len(full_content) - 1:
                                    yield {
                                        "response": current_text,
                                        "session_id": session_id,
                                        "timestamp": datetime.now().isoformat(),
                                        "progress": progress,
                                        "complete": i == len(full_content) - 1
                                    }
                                    
                                    await asyncio.sleep(0.008)  # Very fast for smooth streaming
                    
                    except Exception as llm_error:
                        # Handle LLM errors
                        full_content = f"I apologize, but I encountered an error: {str(llm_error)}"
                        
                        # Stream error message
                        for i, char in enumerate(full_content):
                            current_text = full_content[:i+1]
                            progress = ((i + 1) / len(full_content)) * 100
                            
                            yield {
                                "response": current_text,
                                "session_id": session_id,
                                "timestamp": datetime.now().isoformat(),
                                "progress": progress,
                                "error": True,
                                "complete": i == len(full_content) - 1
                            }
                            
                            await asyncio.sleep(0.02)
                    
                except Exception as e:
                    error_content = f"I apologize, but I encountered an error: {str(e)}"
                    full_content = error_content
                    
                    # Stream error message
                    for i, char in enumerate(error_content):
                        current_text = error_content[:i+1]
                        progress = ((i + 1) / len(error_content)) * 100
                        
                        yield {
                            "response": current_text,
                            "session_id": session_id,
                            "timestamp": datetime.now().isoformat(),
                            "progress": progress,
                            "error": True,
                            "complete": i == len(error_content) - 1
                        }
                        
                        await asyncio.sleep(0.02)
            
            # Add AI response to session history
            if full_content:
                self.sessions[session_id]["conversation_history"].append({
                    "role": "assistant", 
                    "content": full_content,
                    "timestamp": datetime.now().isoformat()
                })
                
        except Exception as e:
            print(f"Streaming error in agent: {e}")
            error_message = f"I apologize, but I encountered an error: {str(e)}"
            
            # Stream error message character by character
            for i, char in enumerate(error_message):
                current_text = error_message[:i+1]
                progress = ((i + 1) / len(error_message)) * 100
                
                yield {
                    "response": current_text,
                    "session_id": session_id or str(uuid.uuid4()),
                    "timestamp": datetime.now().isoformat(),
                    "progress": progress,
                    "error": True,
                    "complete": i == len(error_message) - 1
                }
                
                await asyncio.sleep(0.02)