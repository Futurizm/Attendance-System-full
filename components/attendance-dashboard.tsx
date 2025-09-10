"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { TrendingUp, Users, Calendar, Clock, BarChart3 } from "lucide-react"
import { getAllAttendanceRecords, getAllStudents, getAllEvents } from "@/lib/database"
import { useState, useMemo } from "react"

interface AttendanceStats {
  totalStudents: number
  totalEvents: number
  totalAttendance: number
  todayAttendance: number
  attendanceRate: number
  topEvent: string
  topStudent: string
}

interface ChartData {
  name: string
  value: number
  percentage?: number
}

export function AttendanceDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [selectedClass, setSelectedClass] = useState("all")

  const attendanceRecords = getAllAttendanceRecords()
  const students = getAllStudents()
  const events = getAllEvents()

  // Calculate statistics
  const stats: AttendanceStats = useMemo(() => {
    const today = new Date().toDateString()
    const todayRecords = attendanceRecords.filter((record) => record.timestamp.toDateString() === today)

    // Calculate attendance by event
    const eventAttendance = events.map((event) => ({
      event: event.name,
      count: attendanceRecords.filter((record) => record.eventName === event.name).length,
    }))

    // Calculate attendance by student
    const studentAttendance = students.map((student) => ({
      student: student.name,
      count: attendanceRecords.filter((record) => record.studentId === student.id).length,
    }))

    const topEvent = eventAttendance.reduce((max, current) => (current.count > max.count ? current : max), {
      event: "Нет данных",
      count: 0,
    })

    const topStudent = studentAttendance.reduce((max, current) => (current.count > max.count ? current : max), {
      student: "Нет данных",
      count: 0,
    })

    const attendanceRate =
      students.length > 0 ? (attendanceRecords.length / (students.length * events.length)) * 100 : 0

    return {
      totalStudents: students.length,
      totalEvents: events.length,
      totalAttendance: attendanceRecords.length,
      todayAttendance: todayRecords.length,
      attendanceRate: Math.round(attendanceRate),
      topEvent: topEvent.event,
      topStudent: topStudent.student,
    }
  }, [attendanceRecords, students, events])

  // Prepare chart data
  const eventChartData: ChartData[] = useMemo(() => {
    return events.map((event) => {
      const count = attendanceRecords.filter((record) => record.eventName === event.name).length
      return {
        name: event.name.length > 15 ? event.name.substring(0, 15) + "..." : event.name,
        value: count,
        percentage: stats.totalAttendance > 0 ? Math.round((count / stats.totalAttendance) * 100) : 0,
      }
    })
  }, [events, attendanceRecords, stats.totalAttendance])

  const classChartData: ChartData[] = useMemo(() => {
    const classGroups = students.reduce(
      (acc, student) => {
        acc[student.class] = (acc[student.class] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(classGroups).map(([className, count]) => ({
      name: className,
      value: count,
    }))
  }, [students])

  const attendanceByDayData: ChartData[] = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date
    }).reverse()

    return last7Days.map((date) => {
      const dayRecords = attendanceRecords.filter((record) => record.timestamp.toDateString() === date.toDateString())
      return {
        name: date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" }),
        value: dayRecords.length,
      }
    })
  }, [attendanceRecords])

  const COLORS = ["#1E3A8A", "#3B82F6", "#60A5FA", "#93C5FD", "#DBEAFE"]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Аналитика посещаемости
          </CardTitle>
          <CardDescription>Детальная статистика и визуализация данных посещаемости</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите период" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все время</SelectItem>
                  <SelectItem value="week">Последняя неделя</SelectItem>
                  <SelectItem value="month">Последний месяц</SelectItem>
                  <SelectItem value="today">Сегодня</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все классы</SelectItem>
                  <SelectItem value="10А">10А</SelectItem>
                  <SelectItem value="10Б">10Б</SelectItem>
                  <SelectItem value="11А">11А</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая посещаемость</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">от максимально возможной</p>
            <Progress value={stats.attendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сегодня отметок</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.todayAttendance}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayAttendance > 0 ? "Активность есть" : "Пока нет активности"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Популярное мероприятие</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-primary truncate">{stats.topEvent}</div>
            <p className="text-xs text-muted-foreground">Больше всего посещений</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активный ученик</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-primary truncate">{stats.topStudent}</div>
            <p className="text-xs text-muted-foreground">Больше всего посещений</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance by Event */}
        <Card>
          <CardHeader>
            <CardTitle>Посещаемость по мероприятиям</CardTitle>
            <CardDescription>Количество посещений для каждого мероприятия</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Students by Class */}
        <Card>
          <CardHeader>
            <CardTitle>Распределение по классам</CardTitle>
            <CardDescription>Количество учеников в каждом классе</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Динамика посещаемости</CardTitle>
            <CardDescription>Посещаемость за последние 7 дней</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceByDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#1E3A8A" strokeWidth={3} dot={{ fill: "#1E3A8A" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Students */}
        <Card>
          <CardHeader>
            <CardTitle>Топ учеников по посещаемости</CardTitle>
            <CardDescription>Самые активные ученики</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students
                .map((student) => ({
                  ...student,
                  attendanceCount: attendanceRecords.filter((record) => record.studentId === student.id).length,
                }))
                .sort((a, b) => b.attendanceCount - a.attendanceCount)
                .slice(0, 5)
                .map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "secondary"}>{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.class}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">{student.attendanceCount}</div>
                      <div className="text-xs text-muted-foreground">посещений</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Последняя активность</CardTitle>
            <CardDescription>Недавние отметки посещаемости</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length > 0 ? (
              <div className="space-y-3">
                {attendanceRecords
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .slice(0, 5)
                  .map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{record.studentName}</div>
                        <div className="text-sm text-muted-foreground">{record.eventName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {record.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.timestamp.toLocaleDateString("ru-RU")}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Пока нет записей о посещаемости</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
