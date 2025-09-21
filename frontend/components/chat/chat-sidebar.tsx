"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { Plus, MessageSquare, Clock, X, LogOut, User } from "lucide-react"

interface ChatSession {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  messageCount: number
}

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (sessionId: string) => void
  onClose: () => void
}

export function ChatSidebar({ sessions, currentSessionId, onSelectSession, onNewSession, onDeleteSession, onClose }: ChatSidebarProps) {
  const { user, logout } = useAuth()

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-semibold text-lg text-foreground">Chat Sessions</h2>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Button onClick={onNewSession} className="w-full gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sessions.map((session) => (
          <Card
            key={session.id}
            className={`cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
              currentSessionId === session.id ? "bg-accent border-primary" : "bg-background/50"
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm text-foreground truncate">{session.title}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSession(session.id)
                      }}
                      title="Delete session"
                    >
                      <X className="w-4 h-4 text-red-400 hover:text-red-600" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{session.lastMessage}</p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{session.timestamp}</span>
                    </div>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {session.messageCount}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No chat sessions yet</p>
            <p className="text-muted-foreground text-xs mt-1">Start a new conversation to begin</p>
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user?.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            <User className="w-3 h-3 mr-1" />
            Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex-1 text-red-400 hover:text-red-300 bg-transparent"
          >
            <LogOut className="w-3 h-3 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
