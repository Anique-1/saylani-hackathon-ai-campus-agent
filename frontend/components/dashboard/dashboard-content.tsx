import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Users, GraduationCap, Building2, TrendingUp, RefreshCw, User, Activity, Clock, MessageSquare,
  Search, Plus, Edit, Trash2, Mail, Download, UserPlus, BarChart3, FileText, AlertCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// Interface definitions
interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  enrollment_date: string;
  status: string;
}

interface DepartmentStats {
  name: string;
  total_students: number;
  students: Student[];
}

interface AnalyticsOverview {
  total_students: number;
  active_sessions: number;
  avg_response_time: string;
  system_uptime: string;
  student_growth: string;
  session_growth: string;
  performance_change: string;
}

interface DashboardData {
  students: Student[];
  departments: DepartmentStats[];
  analytics: AnalyticsOverview;
  department_breakdown: { [key: string]: number };
}

const departmentColors = [
  "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#22c55e", "#f97316", "#3b82f6", "#ef4444"
];

interface DashboardContentProps {
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
}

export default function UnifiedDashboard({ user }: DashboardContentProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    students: [],
    departments: [],
    analytics: {
      total_students: 0,
      active_sessions: 0,
      avg_response_time: "N/A",
      system_uptime: "N/A",
      student_growth: "+0%",
      session_growth: "+0%",
      performance_change: "0%"
    },
    department_breakdown: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [authError, setAuthError] = useState<string | null>(null);

  // Mock data for development/demo purposes
  const getMockData = (): DashboardData => {
    const mockStudents: Student[] = [
      {
        id: "1001",
        name: "Alice Johnson",
        email: "alice.johnson@university.edu",
        department: "Computer Science",
        enrollment_date: "2024-01-15T00:00:00Z",
        status: "Active"
      },
      {
        id: "1002",
        name: "Bob Smith",
        email: "bob.smith@university.edu", 
        department: "Engineering",
        enrollment_date: "2024-02-20T00:00:00Z",
        status: "Active"
      },
      {
        id: "1003",
        name: "Carol Davis",
        email: "carol.davis@university.edu",
        department: "Mathematics",
        enrollment_date: "2024-01-30T00:00:00Z",
        status: "Active"
      },
      {
        id: "1004",
        name: "David Wilson",
        email: "david.wilson@university.edu",
        department: "Computer Science",
        enrollment_date: "2024-03-10T00:00:00Z",
        status: "Active"
      },
      {
        id: "1005",
        name: "Emma Brown",
        email: "emma.brown@university.edu",
        department: "Business",
        enrollment_date: "2024-02-05T00:00:00Z",
        status: "Active"
      }
    ];

    const mockDepartments: DepartmentStats[] = [
      { name: "Computer Science", total_students: 45, students: [] },
      { name: "Engineering", total_students: 38, students: [] },
      { name: "Mathematics", total_students: 22, students: [] },
      { name: "Business", total_students: 31, students: [] },
      { name: "Physics", total_students: 18, students: [] }
    ];

    const mockAnalytics: AnalyticsOverview = {
      total_students: 154,
      active_sessions: 23,
      avg_response_time: "1.2s",
      system_uptime: "99.9%",
      student_growth: "+12%",
      session_growth: "+8%",
      performance_change: "+5%"
    };

    const mockDepartmentBreakdown = {
      "Computer Science": 45,
      "Engineering": 38,
      "Business": 31,
      "Mathematics": 22,
      "Physics": 18
    };

    return {
      students: mockStudents,
      departments: mockDepartments,
      analytics: mockAnalytics,
      department_breakdown: mockDepartmentBreakdown
    };
  };

  // Get authentication token with better error handling
  const getAuthToken = () => {
    try {
      // Try multiple possible token storage keys
      const possibleKeys = ['auth_token', 'token', 'authToken', 'access_token'];
      
      for (const key of possibleKeys) {
        const token = localStorage.getItem(key);
        if (token) {
          console.log(`Found auth token with key: ${key}`);
          return token;
        }
      }
      
      // Also check sessionStorage
      for (const key of possibleKeys) {
        const token = sessionStorage.getItem(key);
        if (token) {
          console.log(`Found auth token in sessionStorage with key: ${key}`);
          return token;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error accessing storage:', error);
      return null;
    }
  };

  // Fetch all dashboard data with improved error handling
  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setAuthError(null);
      
      const token = getAuthToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      if (!token) {
        console.warn("No auth token found, using mock data");
        setAuthError("No authentication token found. Using demo data.");
        setDashboardData(getMockData());
        setLastUpdated(new Date().toLocaleTimeString());
        return;
      }

      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      console.log('Making API requests with token:', token.substring(0, 20) + '...');

      // Fetch all data with individual error handling
      const [studentsRes, departmentsRes, analyticsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/analytics/students`, { headers }),
        fetch(`${API_BASE}/analytics/departments`, { headers }),
        fetch(`${API_BASE}/analytics/overview`, { headers })
      ]);

      let hasAuthError = false;
      const newData: DashboardData = {
        students: [],
        departments: [],
        analytics: {
          total_students: 0,
          active_sessions: 0,
          avg_response_time: "N/A",
          system_uptime: "N/A",
          student_growth: "+0%",
          session_growth: "+0%",
          performance_change: "0%"
        },
        department_breakdown: {}
      };

      // Process students data
      if (studentsRes.status === 'fulfilled') {
        if (studentsRes.value.ok) {
          const studentsData = await studentsRes.value.json();
          console.log("Students API response:", studentsData);
          
          newData.students = studentsData.students || [];
          newData.department_breakdown = studentsData.department_breakdown || {};
        } else if (studentsRes.value.status === 401) {
          hasAuthError = true;
          console.error('Authentication failed for students endpoint');
        } else {
          console.error('Students API error:', studentsRes.value.status, studentsRes.value.statusText);
        }
      } else {
        console.error('Students API request failed:', studentsRes.reason);
      }

      // Process departments data
      if (departmentsRes.status === 'fulfilled') {
        if (departmentsRes.value.ok) {
          const departmentsData = await departmentsRes.value.json();
          console.log("Departments API response:", departmentsData);
          
          newData.departments = departmentsData.departments || [];
        } else if (departmentsRes.value.status === 401) {
          hasAuthError = true;
          console.error('Authentication failed for departments endpoint');
        } else {
          console.error('Departments API error:', departmentsRes.value.status, departmentsRes.value.statusText);
        }
      } else {
        console.error('Departments API request failed:', departmentsRes.reason);
      }

      // Process analytics overview
      if (analyticsRes.status === 'fulfilled') {
        if (analyticsRes.value.ok) {
          const analyticsData = await analyticsRes.value.json();
          console.log("Analytics API response:", analyticsData);
          
          if (analyticsData.analytics) {
            newData.analytics = {
              total_students: analyticsData.analytics.total_students || newData.students.length || 0,
              active_sessions: analyticsData.analytics.active_sessions || 0,
              avg_response_time: analyticsData.analytics.avg_response_time || "N/A",
              system_uptime: analyticsData.analytics.system_uptime || "N/A",
              student_growth: analyticsData.analytics.student_growth || "+0%",
              session_growth: analyticsData.analytics.session_growth || "+0%",
              performance_change: analyticsData.analytics.performance_change || "0%"
            };
          }
        } else if (analyticsRes.value.status === 401) {
          hasAuthError = true;
          console.error('Authentication failed for analytics endpoint');
        } else {
          console.error('Analytics API error:', analyticsRes.value.status, analyticsRes.value.statusText);
        }
      } else {
        console.error('Analytics API request failed:', analyticsRes.reason);
      }

      // If authentication failed, show error and use mock data
      if (hasAuthError) {
        setAuthError("Authentication failed. Please log in again. Showing demo data.");
        const mockData = getMockData();
        setDashboardData(mockData);
      } else {
        // Fallback: if analytics doesn't have total_students, use students array length
        if (newData.analytics.total_students === 0 && newData.students.length > 0) {
          newData.analytics.total_students = newData.students.length;
        }

        // If no real data was fetched, use mock data
        if (newData.students.length === 0 && newData.departments.length === 0) {
          console.log("No real data available, using mock data");
          setAuthError("API endpoints unavailable. Using demo data.");
          setDashboardData(getMockData());
        } else {
          setDashboardData(newData);
        }
      }

      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setAuthError("Connection error. Using demo data.");
      setDashboardData(getMockData());
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch and auto-refresh
  useEffect(() => {
    fetchDashboardData();
    
    const dataInterval = setInterval(() => fetchDashboardData(), 30000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Manual refresh
  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  // Get department colors
  const getDepartmentColor = (department: string) => {
    const colors = [
      "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "bg-green-500/20 text-green-400 border-green-500/30",
      "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "bg-orange-500/20 text-orange-400 border-orange-500/30",
      "bg-pink-500/20 text-pink-400 border-pink-500/30",
      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      "bg-red-500/20 text-red-400 border-red-500/30"
    ];
    const index = department.length % colors.length;
    return colors[index];
  };

  // Filter students
  const filteredStudents = dashboardData.students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = selectedDepartment === "all" || student.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Get latest students (sorted by enrollment date) including current user if not present
  const latestStudents = (() => {
    let studentsWithUser = [...dashboardData.students];
    if (user) {
      const userExists = studentsWithUser.some(s => s.id === String(user.id) || s.email === user.email);
      if (!userExists) {
        studentsWithUser.push({
          id: String(user.id),
          name: user.username,
          email: user.email,
          department: "N/A",
          enrollment_date: new Date().toISOString(),
          status: "Active"
        });
      }
    }
    return studentsWithUser
      .sort((a, b) => new Date(b.enrollment_date || '').getTime() - new Date(a.enrollment_date || '').getTime())
      .slice(0, 7);
  })();

  // Prepare chart data
  const enrollmentData = [
    { month: "Jan", students: Math.round(dashboardData.analytics.total_students * 0.8) },
    { month: "Feb", students: Math.round(dashboardData.analytics.total_students * 0.85) },
    { month: "Mar", students: Math.round(dashboardData.analytics.total_students * 0.9) },
    { month: "Apr", students: Math.round(dashboardData.analytics.total_students * 0.95) },
    { month: "May", students: Math.round(dashboardData.analytics.total_students * 0.98) },
    { month: "Jun", students: dashboardData.analytics.total_students },
  ];

  const departmentChartData = dashboardData.departments.map((dept, i) => ({
    name: dept.name,
    students: dept.total_students,
    color: departmentColors[i % departmentColors.length]
  }));

  const activityData = [
    { time: "00:00", sessions: 12 },
    { time: "04:00", sessions: 8 },
    { time: "08:00", sessions: 45 },
    { time: "12:00", sessions: dashboardData.analytics.active_sessions },
    { time: "16:00", sessions: 67 },
    { time: "20:00", sessions: 34 },
  ];

  const totalDepartments = Object.keys(dashboardData.department_breakdown).length;
  const departments = Array.from(new Set(dashboardData.students.map(s => s.department)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Authentication Error Alert */}
        {authError && (
          <Card className="mb-6 bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <p className="text-yellow-300 text-sm">{authError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campus Analytics Dashboard</h1>
          {user && (
            <p className="text-sm text-gray-400 mb-2">Welcome, {user.username}!</p>
          )}
          <p className="text-gray-300">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric"
            })} • {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated}</p>
          )}
          </div>
          
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Activity className="w-3 h-3 mr-1" />
              System Online
            </Badge>
            
            <Button onClick={handleRefresh} disabled={refreshing} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end">
                <DropdownMenuItem className="text-white hover:bg-slate-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Student
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-slate-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Start Chat
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-slate-700">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Analytics Overview Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Analytics Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total Students */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {dashboardData.analytics.student_growth}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-400">Total Students</h3>
                  <p className="text-2xl font-bold text-white">{dashboardData.analytics.total_students}</p>
                  <p className="text-xs text-gray-500">Enrolled students</p>
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {dashboardData.analytics.session_growth}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-400">Active Sessions</h3>
                  <p className="text-2xl font-bold text-white">{dashboardData.analytics.active_sessions}</p>
                  <p className="text-xs text-gray-500">Current chat sessions</p>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <Badge className={
                    dashboardData.analytics.performance_change.startsWith('-') 
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-green-500/20 text-green-400 border-green-500/30"
                  }>
                    {dashboardData.analytics.performance_change}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-400">Response Time</h3>
                  <p className="text-2xl font-bold text-white">{dashboardData.analytics.avg_response_time}</p>
                  <p className="text-xs text-gray-500">Average AI response</p>
                </div>
              </CardContent>
            </Card>

            {/* System Uptime */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">+0.1%</Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-400">System Uptime</h3>
                  <p className="text-2xl font-bold text-white">{dashboardData.analytics.system_uptime}</p>
                  <p className="text-xs text-gray-500">Last 30 days</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Charts Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Student & Department Analytics</h2>
          
          {/* Enrollment Trends */}
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
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
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Department Distribution</CardTitle>
                <CardDescription className="text-gray-400">Student distribution across departments</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={departmentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="students"
                    >
                      {departmentChartData.map((entry, index) => (
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
            <Card className="bg-slate-800/50 border-slate-700">
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
        </section>

        {/* Department Breakdown and Latest Students */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Department Breakdown */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Department Distribution</CardTitle>
                <CardDescription className="text-gray-400">Student count by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData.department_breakdown).map(([department, count]) => (
                    <div key={department} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <span className="text-white font-medium">{department}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getDepartmentColor(department)}>
                          {count} students
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {dashboardData.analytics.total_students > 0 
                            ? ((count / dashboardData.analytics.total_students) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(dashboardData.department_breakdown).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No department data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Latest Students */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Latest Students</CardTitle>
                <CardDescription className="text-gray-400">Most recently enrolled students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {latestStudents.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600 text-white">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-white truncate">{student.name}</h4>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            {student.status || 'Active'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{student.email}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{student.department}</span>
                          <span className="text-xs text-gray-500">
                            {student.enrollment_date ? 
                              new Date(student.enrollment_date).toLocaleDateString() : 
                              'No date'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {latestStudents.length === 0 && (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400">No students found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Student Management */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Student Management</h2>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-white">Student Management</CardTitle>
                  <CardDescription className="text-gray-400">Manage student records and information</CardDescription>
                </div>

                <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
                  <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-700">
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
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Students List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600 text-white">
                          {student.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-white">{student.name}</h3>
                          <Badge className={
                            student.status === "active" || student.status === "Active"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }>
                            {student.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">{student.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">ID: {student.id}</span>
                          <span className="text-xs text-gray-500">{student.department}</span>
                          <span className="text-xs text-gray-500">
                            Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}
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

                {filteredStudents.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No students found matching your criteria</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                <p className="text-sm text-gray-400">
                  Showing {filteredStudents.length} of {dashboardData.students.length} students
                </p>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-white hover:bg-slate-700">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-white hover:bg-slate-700">
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}