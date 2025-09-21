"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, ArrowLeft, Bot, Sparkles, AlertCircle, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { StudentManagement } from "@/components/dashboard/student-management"
import { AnalyticsCards } from "@/components/dashboard/analytics-cards"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { ChartsSection } from "@/components/dashboard/charts-section"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isRegister, setIsRegister] = useState(false) // toggle between login/register
  const { user, setUser } = useAuth()
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token) fetchCurrentUserInfo(token)
  }, [])

  const fetchCurrentUserInfo = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem("auth_token")
        localStorage.removeItem("auth_user")
      }
    } catch (err) {
      console.error("Error fetching user info:", err)
      localStorage.removeItem("auth_token")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login"
      const body = isRegister
        ? { username, email, password }
        : { username, password }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "Request failed")

      // Store token + user info
      localStorage.setItem("auth_token", data.access_token)
      localStorage.setItem("auth_user", JSON.stringify(data.user_info))
      setUser(data.user_info)
      setIsAuthenticated(true)
      setSuccess(isRegister ? "Registration successful!" : "Login successful!")

      if (rememberMe) {
        localStorage.setItem("remember_me", "true")
        localStorage.setItem("saved_username", username)
      } else {
        localStorage.removeItem("remember_me")
        localStorage.removeItem("saved_username")
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    localStorage.removeItem("remember_me")
    localStorage.removeItem("saved_username")
    setUser(null)
    setIsAuthenticated(false)
    setUsername("")
    setPassword("")
    setEmail("")
    setError("")
    setSuccess("")
  }

  if (isAuthenticated) {
    // Redirect to dashboard page to ensure header/navigation is shown
    if (typeof window !== "undefined") {
      router.push("/dashboard")
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{isRegister ? "Register" : "Login"}</CardTitle>
            <CardDescription>
              {isRegister
                ? "Create your account to access the system"
                : "Enter your credentials to sign in"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-500/20 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 border-green-500/20 bg-green-500/10">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400">{success}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              {isRegister && (
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <Label>Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : isRegister ? "Register" : "Login"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => setIsRegister(!isRegister)}>
                {isRegister
                  ? "Already have an account? Login"
                  : "Don't have an account? Register"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
