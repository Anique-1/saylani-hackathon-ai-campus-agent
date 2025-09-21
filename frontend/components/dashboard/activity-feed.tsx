import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Building2, TrendingUp, RefreshCw, User } from "lucide-react";

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

interface AnalyticsData {
  total_students: number;
  department_breakdown: { [key: string]: number };
  students: Student[];
  departments: DepartmentStats[];
}

export default function LiveAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    total_students: 0,
    department_breakdown: {},
    students: [],
    departments: []
  });
  const [latestStudents, setLatestStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Fetch analytics data from API
  const fetchAnalyticsData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const token = localStorage.getItem("auth_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch student analytics
      const studentsResponse = await fetch(`${API_BASE}/analytics/students`, { headers });
      const departmentsResponse = await fetch(`${API_BASE}/analytics/departments`, { headers });
      
      if (studentsResponse.ok && departmentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        const departmentsData = await departmentsResponse.json();
        
        setAnalyticsData({
          total_students: studentsData.total_students || 0,
          department_breakdown: studentsData.department_breakdown || {},
          students: studentsData.students || [],
          departments: departmentsData.departments || []
        });

        // Get latest 7 students (sorted by enrollment date)
        const sortedStudents = (studentsData.students || [])
          .sort((a: Student, b: Student) => 
            new Date(b.enrollment_date || '').getTime() - new Date(a.enrollment_date || '').getTime()
          )
          .slice(0, 7);
        
        setLatestStudents(sortedStudents);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => fetchAnalyticsData(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Manual refresh
  const handleRefresh = () => {
    fetchAnalyticsData(true);
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

  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const totalDepartments = Object.keys(analyticsData.department_breakdown).length;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
      {/* Header with refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campus Analytics Dashboard</h1>
          <p className="text-gray-400">Real-time campus statistics and student data</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated}</p>
          )}
        </div>
        
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="gradient-primary mt-4 sm:mt-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students */}
        <Card className="glass-effect border-white/10 hover:border-white/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analyticsData.total_students}</div>
            <p className="text-xs text-gray-500 mt-1">
              Live count from database
            </p>
          </CardContent>
        </Card>

        {/* Total Departments */}
        <Card className="glass-effect border-white/10 hover:border-white/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalDepartments}</div>
            <p className="text-xs text-gray-500 mt-1">
              Active departments
            </p>
          </CardContent>
        </Card>

        {/* Latest Enrollments */}
        <Card className="glass-effect border-white/10 hover:border-white/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Recent Enrollments</CardTitle>
            <GraduationCap className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{latestStudents.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              Last 7 students added
            </p>
          </CardContent>
        </Card>

        {/* Largest Department */}
        <Card className="glass-effect border-white/10 hover:border-white/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Largest Department</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            {Object.keys(analyticsData.department_breakdown).length > 0 ? (
              <>
                <div className="text-lg font-bold text-white">
                  {Object.entries(analyticsData.department_breakdown)
                    .reduce((max, [dept, count]) => count > max[1] ? [dept, count] : max)[0]}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.max(...Object.values(analyticsData.department_breakdown))} students
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">N/A</div>
                <p className="text-xs text-gray-500 mt-1">No data available</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown and Latest Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Department Distribution</CardTitle>
            <CardDescription className="text-gray-400">Student count by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analyticsData.department_breakdown).map(([department, count]) => (
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
                      {((count / analyticsData.total_students) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
              
              {Object.keys(analyticsData.department_breakdown).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No department data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Latest Students */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Latest Students</CardTitle>
            <CardDescription className="text-gray-400">Most recently enrolled students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors animate-in slide-in-from-right-2"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
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
    </div>
  );
}