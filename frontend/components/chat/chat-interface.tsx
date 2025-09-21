"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ChatSidebar } from "./chat-sidebar"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
import { useAuth } from "@/contexts/auth-context"
import { Send, Bot, Menu } from "lucide-react"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string
  sessionId?: string
}

interface ChatSession {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  messageCount: number
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { user, token, loading } = useAuth()

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Create initial session on mount
  useEffect(() => {
    if (!loading && user && token && !currentSessionId) {
      createNewSession()
    }
  }, [loading, user, token])

  // Load sessions on mount
  useEffect(() => {
    if (token) {
      loadSessions()
    }
  }, [token])

  const createNewSession = async () => {
    setSessionError(null)
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        const sessionId = data.session_id
        setCurrentSessionId(sessionId)
        
        // Clear messages and add welcome message
        const welcomeMessage: Message = {
          id: "welcome",
          type: "ai",
          content: `Hello ${user?.username}! I'm your NUST Campus AI Assistant. I can help you with:

• **Student Management**: Add, update, or delete student records
• **Campus Analytics**: Get insights and statistics about your campus
• **NUST Information**: Answer questions about NUST University
• **General Queries**: Assist with various campus administration tasks

Try asking me something like "Show me campus analytics" or "Add a new student"!`,
          timestamp: new Date().toLocaleTimeString(),
          sessionId: sessionId,
        }

        setMessages([welcomeMessage])
        loadSessions()
      } else {
        let errorMsg = "Failed to create chat session. Please try again later."
        try {
          const errorData = await response.json()
          if (errorData.detail) {
            errorMsg = errorData.detail
          }
        } catch {}
        setSessionError(errorMsg)
      }
    } catch (error) {
      console.error("Failed to create session:", error)
      setSessionError("Unable to connect to backend server. Please check your connection or try again later.")
    }
  }

  const loadSessions = async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        const sessions: ChatSession[] = (data.sessions || []).map((s: any) => ({
          id: s.session_id,
          title: `Chat ${s.session_id.slice(-6)}`,
          lastMessage: "Recent conversation", // We could enhance this later
          timestamp: new Date(s.created_at).toLocaleTimeString(),
          messageCount: s.message_count,
        }))
        setSessions(sessions)
      } else {
        setSessions([])
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
      setSessions([])
    }
  }

  const loadSessionMessages = async (sessionId: string) => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/messages/${sessionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        const messages: Message[] = data.messages.map((m: any) => ({
          id: m.id.toString(),
          type: m.type as "user" | "ai",
          content: m.content,
          timestamp: new Date(m.timestamp).toLocaleTimeString(),
          sessionId: sessionId,
        }))
        setMessages(messages)
      } else {
        console.error("Failed to load session messages")
        setMessages([])
      }
    } catch (error) {
      console.error("Error loading session messages:", error)
      setMessages([])
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !currentSessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString(),
      sessionId: currentSessionId,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: currentSessionId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: data.response,
          timestamp: new Date().toLocaleTimeString(),
          sessionId: currentSessionId,
        }

        setMessages((prev) => [...prev, aiMessage])
        // Reload sessions to update message count
        await loadSessions()
      } else {
        const errorData = await response.json().catch(() => ({}))
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: `I apologize, but I encountered an error: ${errorData.detail || "Unable to process your request"}. Please try again.`,
          timestamp: new Date().toLocaleTimeString(),
          sessionId: currentSessionId,
        }

        setMessages((prev) => [...prev, aiMessage])
      }
    } catch (error) {
      console.error("Chat error:", error)
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "I'm having trouble connecting to the server. Please check your connection and try again.",
        timestamp: new Date().toLocaleTimeString(),
        sessionId: currentSessionId,
      }

      setMessages((prev) => [...prev, aiMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId)
    await loadSessionMessages(sessionId)
    setSidebarOpen(false)
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
          setMessages([])
          await createNewSession()
        }
      } else {
        console.error("Failed to delete session")
      }
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <span className="text-lg text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!user || !token) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <span className="text-lg text-red-500">You must be logged in to use the chat.</span>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-80 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={selectSession}
          onNewSession={createNewSession}
          onDeleteSession={handleDeleteSession}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">NUST Campus AI</h1>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentSessionId && (
              <Badge variant="secondary" className="text-xs">
                Session: {currentSessionId.slice(-6)}
              </Badge>
            )}
          </div>
        </div>

        {/* Error message for session creation */}
        {sessionError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4 text-center">
            <strong className="font-bold">Session Error: </strong>
            <span className="block sm:inline">{sessionError}</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={createNewSession}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about student management, campus analytics, or NUST information..."
                  className="min-h-[60px] max-h-32 resize-none bg-background border-border focus:border-primary focus:ring-primary/20 pr-12"
                  disabled={isLoading || !!sessionError}
                />
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">{inputValue.length}/1000</div>
              </div>

              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading || !!sessionError}
                className="gradient-primary px-6 py-3 h-auto"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-2 text-xs text-muted-foreground text-center">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}