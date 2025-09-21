"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Bot, Users, BarChart3 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function HeroSection() {
  const [typedText, setTypedText] = useState("")
  const { user } = useAuth()
  const fullText = "AI-Powered Campus Administration"

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setTypedText(fullText.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-slate-900 to-slate-800">
        <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] opacity-5"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 gradient-primary rounded-full opacity-20 animate-float"></div>
        <div
          className="absolute top-40 right-20 w-16 h-16 gradient-secondary rounded-full opacity-20 animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-40 left-20 w-24 h-24 gradient-accent rounded-full opacity-20 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 right-10 w-12 h-12 gradient-primary rounded-full opacity-20 animate-float"
          style={{ animationDelay: "0.5s" }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="flex items-center space-x-2 px-4 py-2 rounded-full glass-effect border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">NUST University</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight">
              <span className="block text-balance">
                {typedText}
                <span className="animate-pulse">|</span>
              </span>
              <span className="block gradient-primary bg-clip-text text-transparent mt-2">for NUST Campus</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 text-balance leading-relaxed max-w-2xl">
              Revolutionize your campus management with our intelligent AI agent. Streamline student administration, get
              instant NUST information, and make data-driven decisions with powerful analytics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {user ? (
                <Button asChild size="lg" className="gradient-primary text-lg px-8 py-6 group">
                  <Link href="/chat">
                    Start Chatting
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="gradient-primary text-lg px-8 py-6 group">
                  <Link href="/register">
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              )}

              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                <Link href="#features">Learn More</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/10">
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-sm text-gray-400">AI Assistance</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-white">1000+</div>
                <div className="text-sm text-gray-400">Students Managed</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-white">99%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="relative z-10 glass-effect rounded-2xl p-8 border border-white/10">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">AI Campus Agent</div>
                    <div className="text-gray-400 text-sm">Online and ready</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4 border-l-4 border-primary">
                    <div className="text-white text-sm">
                      "Add student Ali Ahmed to Computer Science with email ali@nust.edu.pk"
                    </div>
                  </div>

                  <div className="bg-primary/10 rounded-lg p-4 border-l-4 border-primary">
                    <div className="text-white text-sm">
                      ✅ Student Ali Ahmed added successfully! Welcome email sent to ali@nust.edu.pk
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                    <div className="text-xs text-gray-400">Students</div>
                  </div>
                  <div className="text-center">
                    <BarChart3 className="w-6 h-6 text-secondary mx-auto mb-2" />
                    <div className="text-xs text-gray-400">Analytics</div>
                  </div>
                  <div className="text-center">
                    <Bot className="w-6 h-6 text-accent mx-auto mb-2" />
                    <div className="text-xs text-gray-400">AI Powered</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 gradient-secondary rounded-full opacity-20 animate-pulse"></div>
            <div
              className="absolute -bottom-4 -left-4 w-32 h-32 gradient-accent rounded-full opacity-20 animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>
          </div>
        </div>
      </div>
    </section>
  )
}
