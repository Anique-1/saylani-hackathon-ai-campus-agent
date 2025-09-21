"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, TrendingUp, Clock } from "lucide-react"

interface AnalyticsData {
  totalStudents: number
  activeSessions: number
  responseTime: string
  systemUptime: string
  studentGrowth: string
  sessionGrowth: string
  performanceChange: string
}

export function AnalyticsCards() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalStudents: 1247,
    activeSessions: 89,
    responseTime: "0.3s",
    systemUptime: "99.9%",
    studentGrowth: "+15%",
    sessionGrowth: "+8%",
    performanceChange: "-12%",
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const response = await fetch(`${API_BASE}/analytics/overview`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          const data = await response.json()
          console.log("Analytics overview data:", data)  // Added log
          setAnalytics({
            totalStudents: data.analytics?.total_students ?? 0,
            activeSessions: data.analytics?.active_sessions ?? 0,
            responseTime: data.analytics?.avg_response_time ?? "N/A",
            systemUptime: data.analytics?.system_uptime ?? "N/A",
            studentGrowth: data.analytics?.student_growth ?? "+0%",
            sessionGrowth: data.analytics?.session_growth ?? "+0%",
            performanceChange: data.analytics?.performance_change ?? "0%",
          })
        } else {
          console.error("Failed to fetch analytics overview")
        }
      } catch (error) {
        console.error("Error fetching analytics overview:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const cards = [
    {
      title: "Total Students",
      value: analytics.totalStudents.toLocaleString(),
      change: analytics.studentGrowth,
      icon: Users,
      gradient: "gradient-primary",
      description: "Enrolled students",
    },
    {
      title: "Active Sessions",
      value: analytics.activeSessions.toString(),
      change: analytics.sessionGrowth,
      icon: MessageSquare,
      gradient: "gradient-secondary",
      description: "Current chat sessions",
    },
    {
      title: "Response Time",
      value: analytics.responseTime,
      change: analytics.performanceChange,
      icon: TrendingUp,
      gradient: "gradient-accent",
      description: "Average AI response",
    },
    {
      title: "System Uptime",
      value: analytics.systemUptime,
      change: "+0.1%",
      icon: Clock,
      gradient: "gradient-primary",
      description: "Last 30 days",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        const isPositive = card.change.startsWith("+")
        const isNegative = card.change.startsWith("-")

        return (
          <Card
            key={card.title}
            className="glass-effect border-white/10 hover:border-white/20 transition-all duration-300 group hover:scale-105"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 ${card.gradient} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <Badge
                  className={`${
                    isPositive
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : isNegative
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  }`}
                >
                  {card.change}
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">{card.title}</h3>
                {isLoading ? (
                  <div className="h-8 bg-white/10 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                )}
                <p className="text-xs text-gray-500">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
