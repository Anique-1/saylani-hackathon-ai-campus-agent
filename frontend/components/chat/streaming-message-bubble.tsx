"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { Bot, Copy, Check, Zap, Activity, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreamingMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string
  sessionId?: string
  isStreaming?: boolean
  streamProgress?: number
}

interface StreamingMessageBubbleProps {
  message: StreamingMessage
}

export function StreamingMessageBubble({ message }: StreamingMessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [displayedContent, setDisplayedContent] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)
  const [showCursor, setShowCursor] = useState(false)
  const { user } = useAuth()

  // Optimized content update with throttling for smooth streaming
  useEffect(() => {
    if (message.type === "ai") {
      if (message.isStreaming) {
        setDisplayedContent(message.content)
        setIsAnimating(true)
        setShowCursor(true)
      } else {
        setDisplayedContent(message.content)
        setIsAnimating(false)
        setShowCursor(false)
      }
    } else {
      setDisplayedContent(message.content)
      setIsAnimating(false)
      setShowCursor(false)
    }
  }, [message.content, message.isStreaming, message.type])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  // Optimized content formatting with memoization
  const formattedContent = useMemo(() => {
    if (!displayedContent.trim()) {
      return (
        <div className="flex items-center space-x-2 text-muted-foreground italic">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating response...</span>
        </div>
      )
    }

    return displayedContent
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/•/g, "•")
      .split("\n")
      .map((line, index) => (
        <div key={index} className={line.trim() === "" ? "h-2" : ""}>
          <span dangerouslySetInnerHTML={{ __html: line }} />
        </div>
      ))
  }, [displayedContent])

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
          <div className={cn(
            "w-8 h-8 gradient-accent rounded-lg flex items-center justify-center relative transition-all duration-200",
            message.isStreaming && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
          )}>
            <Bot className="w-4 h-4 text-white" />
            {message.isStreaming && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse flex items-center justify-center">
                <Activity className="w-2 h-2 text-white" />
              </div>
            )}
          </div>
        ) : (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Message Content */}
      <div className={cn("flex-1 max-w-3xl", message.type === "user" ? "flex flex-col items-end" : "")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 shadow-sm relative transition-all duration-200",
            message.type === "user"
              ? "gradient-primary text-white ml-12"
              : "bg-card border border-border text-foreground mr-12",
            message.isStreaming && "border-primary/50 shadow-lg shadow-primary/10",
            isAnimating && message.isStreaming && "shadow-xl"
          )}
        >
          {/* Enhanced Streaming Progress Bar */}
          {message.isStreaming && message.streamProgress !== undefined && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-2xl overflow-hidden">
              <div
                className={cn(
                  "h-full bg-gradient-to-r transition-all duration-300 ease-out",
                  message.type === "user" 
                    ? "from-white/50 to-white/80"
                    : "from-primary/60 to-primary"
                )}
                style={{ width: `${message.streamProgress}%` }}
              >
                <div className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
              </div>
            </div>
          )}

          <div className="text-sm leading-relaxed relative">
            {formattedContent}
            {/* Enhanced streaming cursor */}
            {showCursor && message.isStreaming && displayedContent && (
              <span className={cn(
                "inline-block w-0.5 h-4 ml-1 rounded-sm animate-pulse",
                message.type === "user" ? "bg-white/80" : "bg-primary"
              )} />
            )}
          </div>

          {/* Enhanced Streaming Status */}
          {message.isStreaming && (
            <div className={cn(
              "flex items-center justify-between mt-3 pt-2 transition-all duration-200",
              message.type === "user" ? "border-t border-white/20" : "border-t border-border"
            )}>
              <div className="flex items-center space-x-2">
                {/* Animated dots */}
                <div className="flex space-x-1">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full animate-bounce",
                    message.type === "user" ? "bg-white/60" : "bg-primary"
                  )}></div>
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full animate-bounce",
                      message.type === "user" ? "bg-white/60" : "bg-primary"
                    )}
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full animate-bounce",
                      message.type === "user" ? "bg-white/60" : "bg-primary"
                    )}
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                
                <span className={cn(
                  "text-xs font-medium",
                  message.type === "user" ? "text-white/80" : "text-muted-foreground"
                )}>
                  Streaming...
                </span>
              </div>

              {/* Progress and controls */}
              <div className="flex items-center space-x-2">
                {message.streamProgress !== undefined && (
                  <div className="flex items-center space-x-1">
                    <div className={cn(
                      "w-12 h-1 rounded-full overflow-hidden",
                      message.type === "user" ? "bg-white/20" : "bg-muted"
                    )}>
                      <div
                        className={cn(
                          "h-full transition-all duration-200 rounded-full",
                          message.type === "user" ? "bg-white/80" : "bg-primary"
                        )}
                        style={{ width: `${message.streamProgress}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-mono tabular-nums",
                      message.type === "user" ? "text-white/70" : "text-muted-foreground"
                    )}>
                      {Math.round(message.streamProgress)}%
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-1">
                  <Zap className={cn(
                    "w-3 h-3",
                    message.type === "user" ? "text-white/60" : "text-primary"
                  )} />
                  <span className={cn(
                    "text-xs",
                    message.type === "user" ? "text-white/60" : "text-primary"
                  )}>
                    Live
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Completed indicator with enhanced animation */}
          {!message.isStreaming && message.type === "ai" && message.content && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Enhanced Message Actions */}
        <div
          className={cn(
            "flex items-center space-x-3 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200",
            message.type === "user" ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {message.timestamp}
          </span>

          {message.type === "ai" && !message.isStreaming && message.content && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copyToClipboard} 
              className="h-7 px-2 text-xs hover:bg-accent transition-all duration-200"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1 text-green-600" />
                  <span className="text-green-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}

          {/* Enhanced streaming indicators */}
          {message.isStreaming && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs">
                <div className="flex items-center space-x-1 text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                  <Zap className="w-3 h-3" />
                  <span className="font-medium">Live Stream</span>
                </div>
              </div>
            </div>
          )}

          {/* Completion indicator */}
          {!message.isStreaming && message.streamProgress === 100 && message.type === "ai" && (
            <div className="flex items-center space-x-1 text-xs text-green-600 animate-in slide-in-from-left duration-300">
              <Check className="w-3 h-3" />
              <span className="font-medium">Stream Complete</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}