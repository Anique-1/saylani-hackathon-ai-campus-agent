"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, MessageSquare, TrendingUp, Users } from "lucide-react"

const demoMessages = [
  {
    type: "user",
    message: "Show me campus analytics",
    timestamp: "2:34 PM",
  },
  {
    type: "ai",
    message:
      "Here's your campus overview: 1,247 total students across 8 departments. Computer Science leads with 312 students, followed by Engineering with 289. Recent enrollment is up 15% this month!",
    timestamp: "2:34 PM",
  },
  {
    type: "user",
    message: "Add student Sara Khan to Mathematics with email sara@nust.edu.pk",
    timestamp: "2:35 PM",
  },
  {
    type: "ai",
    message:
      "✅ Student Sara Khan added successfully to Mathematics department! Welcome email sent to sara@nust.edu.pk. Student ID: STU1248",
    timestamp: "2:35 PM",
  },
]

const stats = [
  { label: "Total Students", value: "1,247", icon: Users, change: "+15%" },
  { label: "Active Sessions", value: "89", icon: MessageSquare, change: "+8%" },
  { label: "Response Time", value: "0.3s", icon: TrendingUp, change: "-12%" },
]

export function DemoSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMessage, setCurrentMessage] = useState(0)

  const toggleDemo = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      // Simulate message progression
      const interval = setInterval(() => {
        setCurrentMessage((prev) => {
          if (prev >= demoMessages.length - 1) {
            clearInterval(interval)
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 2000)
    }
  }

  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">See It In Action</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto text-balance">
            Watch how our AI agent handles real campus administration tasks with natural language commands
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Chat Demo */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif font-semibold text-white">Live Chat Demo</h3>
              <Button onClick={toggleDemo} className={`${isPlaying ? "gradient-secondary" : "gradient-primary"} px-6`}>
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Play Demo
                  </>
                )}
              </Button>
            </div>

            <Card className="glass-effect border-white/10 h-96 overflow-hidden">
              <CardContent className="p-6 h-full flex flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {demoMessages.slice(0, currentMessage + 1).map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-lg ${
                          msg.type === "user"
                            ? "gradient-primary text-white"
                            : "bg-white/10 text-white border border-white/20"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-2 text-gray-400 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>AI Agent is online</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Preview */}
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-semibold text-white">Real-time Analytics</h3>

            <div className="grid gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.label} className="glass-effect border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">{stat.label}</p>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                          </div>
                        </div>
                        <Badge className="gradient-secondary text-white">{stat.change}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Card className="glass-effect border-white/10">
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Department Distribution</h4>
                <div className="space-y-3">
                  {[
                    { name: "Computer Science", count: 312, percentage: 25 },
                    { name: "Engineering", count: 289, percentage: 23 },
                    { name: "Mathematics", count: 234, percentage: 19 },
                    { name: "Physics", count: 198, percentage: 16 },
                  ].map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{dept.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full gradient-primary rounded-full transition-all duration-1000"
                            style={{ width: `${dept.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-white text-sm font-medium">{dept.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
