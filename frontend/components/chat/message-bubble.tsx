"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { Bot, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string
  sessionId?: string
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const { user } = useAuth()

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/•/g, "•")
      .split("\n")
      .map((line, index) => (
        <div key={index} className={line.trim() === "" ? "h-2" : ""}>
          <span dangerouslySetInnerHTML={{ __html: line }} />
        </div>
      ))
  }

  return (
    <div
      className={cn(
        "flex items-start space-x-3 group animate-in slide-in-from-bottom-2",
        message.type === "user" ? "flex-row-reverse space-x-reverse" : "",
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.type === "ai" ? (
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
        ) : (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
              {user?.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Message Content */}
      <div className={cn("flex-1 max-w-3xl", message.type === "user" ? "flex flex-col items-end" : "")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 shadow-sm",
            message.type === "user"
              ? "gradient-primary text-white ml-12"
              : "bg-card border border-border text-foreground mr-12",
          )}
        >
          <div className="text-sm leading-relaxed">{formatContent(message.content)}</div>
        </div>

        {/* Message Actions */}
        <div
          className={cn(
            "flex items-center space-x-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity",
            message.type === "user" ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-xs text-muted-foreground">{message.timestamp}</span>

          {message.type === "ai" && (
            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 px-2 text-xs hover:bg-accent">
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
