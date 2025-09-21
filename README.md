# NUST Campus Administration Project

## Overview
This project is a unified AI-powered campus administration system for NUST (National University of Sciences and Technology). It consists of a backend API built with FastAPI and a frontend built with React/Next.js.

The system provides:
- User authentication and session management
- AI-powered chat interface for campus administration and NUST information
- Student management (add, update, delete, list students)
- Campus analytics and reporting
- Email notifications for student account events
- Real-time streaming chat responses

## Backend

### Technologies
- Python 3.10+
- FastAPI
- SQLite (local database)
- JWT for authentication
- LangChain and Gemini LLM for AI chat
- Email notifications via SMTP (Gmail)
- SSE for streaming chat responses

### Key Files
- `main.py`: FastAPI app entry point with all API endpoints
- `models.py`: Database manager and JWT token manager
- `unified_agent.py`: Unified AI agent handling chat and campus admin logic
- `email_service.py`: Email sending service with templated notifications
- `requirements.txt`: Python dependencies
- `Dockerfile`: Containerization for backend

### Environment Variables
- `GEMINI_API_KEY`: API key for Gemini LLM (required for AI chat)
- `GMAIL_EMAIL`: Gmail address for sending emails
- `GMAIL_APP_PASSWORD`: Gmail app password for SMTP
- `HOST`: Host to run backend server (default `0.0.0.0`)
- `PORT`: Port to run backend server (default `8000`)

### Running Backend
```bash
pip install -r project/backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## Frontend

### Technologies
- React 18 / Next.js 13
- TypeScript
- Tailwind CSS
- Context API for auth state
- Various UI components for dashboard, chat, student management

### Key Files
- `project/frontend/app/`: Next.js app pages and routes
- `project/frontend/components/`: Reusable UI components
- `project/frontend/contexts/auth-context.tsx`: Authentication context provider

### Running Frontend
```bash
cd project/frontend
npm install
npm run dev
```

## Features

- User registration and login with JWT authentication
- AI chat interface with real-time streaming responses
- Student management with add, update, delete, and list functionality
- Campus analytics overview and detailed reports
- Email notifications for student account creation and updates
- Health check and system info endpoints

## Notes

- Ensure environment variables are set before running backend
- Backend must be running for frontend to connect to API
- The AI chat uses Gemini LLM and LangChain tools for campus admin tasks
- Email sending can be mocked if credentials are not provided

## License

MIT License

---

For more details, refer to the source code and inline documentation.
