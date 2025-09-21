"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChatSidebar } from "./chat-sidebar"
import { StreamingMessageBubble } from "./streaming-message-bubble"
import { useAuth } from "@/contexts/auth-context"
import { Send, Bot, Menu, Play, Pause, Square } from "lucide-react"

interface StreamingMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string
  sessionId?: string
  isStreaming?: boolean
  streamProgress?: number
}

interface ChatSession {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  messageCount: number
}

export function StreamingChatInterface() {
  const [messages, setMessages] = useState<StreamingMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingPaused, setStreamingPaused] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [streamProgress, setStreamProgress] = useState(0)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
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

  // Create initial session on mount - Fixed duplicate logic
  useEffect(() => {
    if (!loading && user && token && !currentSessionId && sessions.length === 0) {
      createNewSession()
    }
  }, [loading, user, token, currentSessionId, sessions.length])

  // Load sessions on mount
  useEffect(() => {
    if (token && sessions.length === 0) {
      loadSessions()
    }
  }, [token, sessions.length])

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
        
        // Only set if not already set to prevent duplicates
        if (!currentSessionId || currentSessionId !== sessionId) {
          setCurrentSessionId(sessionId)
          
          // Add welcome message with streaming effect
          const welcomeMessage: StreamingMessage = {
            id: `welcome-${sessionId}`,
            type: "ai",
            content: `Hello ${user?.username}! Welcome to the Streaming Chat Interface. 

This enhanced version provides real-time streaming responses with live text generation. You can:

• **Real-time Streaming**: See responses as they're generated character by character
• **Pause/Resume**: Control the streaming flow at any time
• **Progress Tracking**: Visual indicators show streaming progress
• **Session Management**: All conversations are saved and can be resumed
• **Enhanced UX**: More engaging than traditional request-response patterns

Try asking me something about student management, campus analytics, or NUST information!`,
            timestamp: new Date().toLocaleTimeString(),
            sessionId: sessionId,
            isStreaming: false,
          }

          setMessages([welcomeMessage])
        }
        await loadSessions()
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
        const sessionsData: ChatSession[] = (data.sessions || []).map((s: any) => ({
          id: s.session_id,
          title: `Stream Chat ${s.session_id.slice(-6)}`,
          lastMessage: "Streaming conversation",
          timestamp: new Date(s.created_at).toLocaleTimeString(),
          messageCount: s.message_count,
        }))
        
        // Prevent duplicates by checking existing sessions
        setSessions(prevSessions => {
          const existingIds = prevSessions.map(s => s.id)
          const newSessions = sessionsData.filter(s => !existingIds.includes(s.id))
          return [...prevSessions, ...newSessions]
        })
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
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
        const messages: StreamingMessage[] = data.messages.map((m: any) => ({
          id: m.id.toString(),
          type: m.type as "user" | "ai",
          content: m.content,
          timestamp: new Date(m.timestamp).toLocaleTimeString(),
          sessionId: sessionId,
          isStreaming: false,
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

  const streamResponse = async (messageId: string, userMessage: string, sessionId: string) => {
    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()
      
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      })
  
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
  
      if (!response.body) {
        throw new Error("No response body")
      }
  
      const reader = response.body.getReader()
      streamReaderRef.current = reader
      const decoder = new TextDecoder()
      let buffer = ""
  
      // Process the stream
      while (true) {
        // Check if streaming is paused
        if (streamingPaused) {
          await new Promise(resolve => {
            const checkPause = () => {
              if (!streamingPaused) {
                resolve(undefined)
              } else {
                setTimeout(checkPause, 50) // Check every 50ms when paused
              }
            }
            checkPause()
          })
        }
  
        const { done, value } = await reader.read()
        
        if (done) break
  
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // Process complete lines (Server-Sent Events format)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
  
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine === '') continue
          
          // Parse Server-Sent Events format
          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonData = trimmedLine.slice(6).trim()
              if (jsonData === '[DONE]') break
              
              const eventData = JSON.parse(jsonData)
              console.log('Received streaming data:', eventData)
              
              // Handle different event types
              if (eventData.event === 'error') {
                const errorData = typeof eventData.data === 'string' ? JSON.parse(eventData.data) : eventData.data
                throw new Error(errorData?.error || 'Streaming error occurred')
              }
              
              if (eventData.event === 'message' || eventData.event === 'complete') {
                const responseData = typeof eventData.data === 'string' ? JSON.parse(eventData.data) : eventData.data
                
                if (responseData?.response !== undefined) {
                  const fullContent = responseData.response
                  const progress = responseData.progress || 0
                  const isComplete = eventData.event === 'complete' || responseData.complete
                  
                  // Update message immediately with new content
                  setMessages(prev => {
                    const updatedMessages = prev.map(msg => 
                      msg.id === messageId ? {
                        ...msg,
                        content: fullContent,
                        isStreaming: !isComplete,
                        streamProgress: progress
                      } : msg
                    )
                    return updatedMessages
                  })
                  
                  setStreamProgress(progress)
                  
                  // If complete, stop streaming
                  if (isComplete) {
                    break
                  }
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError, 'Line:', trimmedLine)
              // Continue processing other lines instead of breaking
              continue
            }
          }
        }
        
        // Force a small delay to prevent overwhelming the UI
        await new Promise(resolve => setTimeout(resolve, 5))
      }
  
      // Ensure message is marked as complete
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? {
          ...msg,
          isStreaming: false,
          streamProgress: 100
        } : msg
      ))
      
      setStreamProgress(100)
      
      // Clear progress after a short delay
      setTimeout(() => setStreamProgress(0), 1500)
      
      // Reload sessions to update message count
      await loadSessions()
      
    } catch (error: any) {
      console.error("Streaming error:", error)
      
      if (error.name === 'AbortError') {
        // Stream was intentionally stopped
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? {
            ...msg,
            isStreaming: false,
            content: msg.content + "\n\n[Stream stopped by user]"
          } : msg
        ))
      } else {
        // Show error message
        const errorContent = `I apologize, but I encountered an error while streaming: ${error.message}. Please try again.`
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? {
            ...msg,
            isStreaming: false,
            content: msg.content || errorContent
          } : msg
        ))
      }
    } finally {
      setIsStreaming(false)
      setStreamingPaused(false)
      setStreamProgress(0)
      streamReaderRef.current = null
      abortControllerRef.current = null
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isStreaming || !currentSessionId) return

    const userMessage: StreamingMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString(),
      sessionId: currentSessionId,
    }

    setMessages(prev => [...prev, userMessage])
    const messageContent = inputValue.trim()
    setInputValue("")
    setIsStreaming(true)
    setStreamingPaused(false)

    // Create AI message placeholder
    const aiMessageId = `ai-${Date.now()}`
    const aiMessage: StreamingMessage = {
      id: aiMessageId,
      type: "ai",
      content: "",
      timestamp: new Date().toLocaleTimeString(),
      sessionId: currentSessionId,
      isStreaming: true,
      streamProgress: 0,
    }

    setMessages(prev => [...prev, aiMessage])

    // Start streaming
    await streamResponse(aiMessageId, messageContent, currentSessionId)
  }

  const pauseStreaming = () => {
    setStreamingPaused(true)
  }

  const resumeStreaming = () => {
    setStreamingPaused(false)
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    if (streamReaderRef.current) {
      streamReaderRef.current.cancel()
    }
    
    setIsStreaming(false)
    setStreamingPaused(false)
    setStreamProgress(0)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selectSession = async (sessionId: string) => {
    // Stop any ongoing streaming
    if (isStreaming) {
      stopStreaming()
    }
    
    // Don't reload if it's the same session
    if (currentSessionId === sessionId) {
      setSidebarOpen(false)
      return
    }
    
    setCurrentSessionId(sessionId)
    await loadSessionMessages(sessionId)
    setSidebarOpen(false)
  }

  const handleNewSession = async () => {
    // Stop any ongoing streaming
    if (isStreaming) {
      stopStreaming()
    }
    
    // Clear current session
    setCurrentSessionId(null)
    setMessages([])
    
    // Create new session
    await createNewSession()
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
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          // Stop streaming if deleting current session
          if (isStreaming) {
            stopStreaming()
          }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (streamReaderRef.current) {
        streamReaderRef.current.cancel()
      }
    }
  }, [])

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
        <span className="text-lg text-red-500">You must be logged in to use the streaming chat.</span>
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
          onNewSession={handleNewSession}
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
              <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">NUST Campus AI - Streaming</h1>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isStreaming ? 'bg-blue-400' : 'bg-green-400'}`}></div>
                  <span className="text-xs text-muted-foreground">
                    {isStreaming ? (streamingPaused ? "Paused" : "Streaming...") : "Ready to stream"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isStreaming && (
              <div className="flex items-center space-x-2">
                <Progress value={streamProgress} className="w-20 h-2" />
                <span className="text-xs text-muted-foreground">{Math.round(streamProgress)}%</span>
              </div>
            )}

            {currentSessionId && (
              <Badge variant="secondary" className="text-xs">
                Session: {currentSessionId.slice(-6)}
              </Badge>
            )}

            <Badge variant="secondary" className="text-xs">
              Stream Mode
            </Badge>
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
            <StreamingMessageBubble key={message.id} message={message} />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Streaming Controls */}
        {isStreaming && (
          <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">
                    {streamingPaused ? "Streaming paused..." : "Streaming response..."}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {streamingPaused ? (
                    <Button onClick={resumeStreaming} size="sm" className="gradient-primary">
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button onClick={pauseStreaming} size="sm" className="gradient-secondary">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}

                  <Button
                    onClick={stopStreaming}
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  placeholder="Ask me anything and watch the response stream in real-time..."
                  className="min-h-[60px] max-h-32 resize-none bg-background border-border focus:border-primary focus:ring-primary/20 pr-12"
                  disabled={isStreaming || !!sessionError}
                />
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">{inputValue.length}/1000</div>
              </div>

              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isStreaming || !!sessionError}
                className="gradient-accent px-6 py-3 h-auto"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-2 text-xs text-muted-foreground text-center">
              Press Enter to send • Streaming responses with real-time controls • Messages are automatically saved
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