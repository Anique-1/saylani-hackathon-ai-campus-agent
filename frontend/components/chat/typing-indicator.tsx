"use client"

import { Bot } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex items-start space-x-3 animate-in slide-in-from-bottom-2">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Typing Animation */}
      <div className="flex-1 max-w-3xl">
        <div className="bg-card border border-border rounded-2xl px-4 py-3 mr-12">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
            <span className="text-xs text-muted-foreground ml-2">AI is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
