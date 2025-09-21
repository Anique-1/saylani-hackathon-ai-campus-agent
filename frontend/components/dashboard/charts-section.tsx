"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

import { useState, useEffect } from "react"

const departmentColors = [
  "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#22c55e", "#f97316", "#3b82f6", "#ef4444"
]

export function ChartsSection() {
  const [enrollmentData, setEnrollmentData] = useState<any[]>([])
  const [departmentData, setDepartmentData] = useState<any[]>([])
  const [activityData, setActivityData] = useState<any[]>([])

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

        // Fetch students analytics
        const studentsRes = await fetch(`${API_BASE}/analytics/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        let studentsData = []
        if (studentsRes.ok) {
          const data = await studentsRes.json()
          console.log("Student analytics data:", data)  // Added log
          // For enrollment trends, mock monthly data from total_students
          const total = data.total_students || 0
          studentsData = [
            { month: "Jan", students: Math.round(total * 0.8), newEnrollments: 45 },
            { month: "Feb", students: Math.round(total * 0.85), newEnrollments: 52 },
            { month: "Mar", students: Math.round(total * 0.9), newEnrollments: 68 },
            { month: "Apr", students: Math.round(total * 0.95), newEnrollments: 75 },
            { month: "May", students: Math.round(total * 0.98), newEnrollments: 62 },
            { month: "Jun", students: total, newEnrollments: 58 },
          ]
        } else {
          console.error("Failed to fetch student analytics")
        }
        setEnrollmentData(studentsData)

        // Fetch departments analytics
        const deptRes = await fetch(`${API_BASE}/analytics/departments`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        let deptData = []
        if (deptRes.ok) {
          const data = await deptRes.json()
          console.log("Department analytics data:", data)  // Added log
          deptData = (data.departments || []).map((dept: any, i: number) => ({
            name: dept.name,
            students: dept.total_students,
            color: departmentColors[i % departmentColors.length],
          }))
        } else {
          console.error("Failed to fetch department analytics")
        }
        setDepartmentData(deptData)

        // Optionally, mock activity data (since not provided by backend)
        setActivityData([
          { time: "00:00", sessions: 12 },
          { time: "04:00", sessions: 8 },
          { time: "08:00", sessions: 45 },
          { time: "12:00", sessions: 89 },
          { time: "16:00", sessions: 67 },
          { time: "20:00", sessions: 34 },
        ])
      } catch (error) {
        console.error("Error fetching analytics data:", error)
      }
    }
    fetchAnalytics()
  }, [])

  return (
    <div className="space-y-8">
      {/* Enrollment Trends */}
      <Card className="glass-effect border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Student Enrollment Trends</CardTitle>
          <CardDescription className="text-gray-400">Monthly enrollment growth over the past 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={enrollmentData}>
              <defs>
                <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f8fafc",
                }}
              />
              <Area
                type="monotone"
                dataKey="students"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#enrollmentGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Department Distribution */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Department Distribution</CardTitle>
            <CardDescription className="text-gray-400">Student distribution across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="students"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                />
                <Legend wrapperStyle={{ color: "#f8fafc" }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Activity */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Daily Activity</CardTitle>
            <CardDescription className="text-gray-400">Active sessions throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                />
                <Bar dataKey="sessions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
