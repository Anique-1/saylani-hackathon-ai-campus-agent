"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Plus, Edit, Trash2, Mail, Download } from "lucide-react"

interface Student {
  id: string
  name: string
  email: string
  department: string
  enrollmentDate: string
  status: "active" | "inactive"
}

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("all")

  // Fetch students from backend
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const response = await fetch(`${API_BASE}/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data.students)) {
            setStudents(
              data.students.map((student: any) => ({
                id: student.id,
                name: student.name,
                email: student.email,
                department: student.department,
                enrollmentDate: student.enrollment_date || student.enrollmentDate || "",
                status: student.status || "active",
              }))
            )
          }
        }
      } catch (error) {
        // fallback to empty or mock data if needed
      }
    }
    fetchStudents()
  }, [])

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment = selectedDepartment === "all" || student.department === selectedDepartment

    return matchesSearch && matchesDepartment
  })

  const departments = Array.from(new Set(students.map((s) => s.department)))

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-white">Student Management</CardTitle>
            <CardDescription className="text-gray-400">Manage student records and information</CardDescription>
          </div>

          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
            <Button variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search students by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white focus:border-primary focus:ring-primary/20"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {student.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-white">{student.name}</h3>
                      <Badge
                        className={
                          student.status === "active"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }
                      >
                        {student.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{student.email}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">ID: {student.id}</span>
                      <span className="text-xs text-gray-500">{student.department}</span>
                      <span className="text-xs text-gray-500">
                        Enrolled: {new Date(student.enrollmentDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No students found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <p className="text-sm text-gray-400">
            Showing {filteredStudents.length} of {students.length} students
          </p>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10">
              Previous
            </Button>
            <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
