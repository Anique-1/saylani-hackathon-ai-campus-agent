"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: number
  username: string
  email: string
}

interface AuthContextType {
  user: User | null
  setUser: React.Dispatch<React.SetStateAction<User | null>>
  token: string | null
  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // API base URL - adjust this to match your FastAPI backend
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem("auth_token")
    const storedUser = localStorage.getItem("auth_user")

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }

    setLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.access_token)
        setUser(data.user_info)

        localStorage.setItem("auth_token", data.access_token)
        localStorage.setItem("auth_user", JSON.stringify(data.user_info))

        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user_info.username}!`,
        })

        return true
      } else {
        const error = await response.json()
        toast({
          title: "Login failed",
          description: error.detail || "Invalid credentials",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      toast({
        title: "Login error",
        description: "Unable to connect to server",
        variant: "destructive",
      })
      return false
    }
  }

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.access_token)
        setUser(data.user_info)

        localStorage.setItem("auth_token", data.access_token)
        localStorage.setItem("auth_user", JSON.stringify(data.user_info))

        toast({
          title: "Registration successful",
          description: `Welcome, ${data.user_info.username}!`,
        })

        return true
      } else {
        const error = await response.json()
        toast({
          title: "Registration failed",
          description: error.detail || "Unable to create account",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      toast({
        title: "Registration error",
        description: "Unable to connect to server",
        variant: "destructive",
      })
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")

    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    })

    router.push("/")
  }

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
