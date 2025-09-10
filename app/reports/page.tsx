import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GoogleSheetsExport } from "@/components/google-sheets-export"
import { getAllAttendanceRecords, getAllStudents, getAllEvents } from "@/lib/database"
import { BarChart3, Users, Calendar } from "lucide-react"
import Link from "next/link"

export default function ReportsPage() {
  const attendanceRecords = getAllAttendanceRecords()
  const students = getAllStudents()
  const events = getAllEvents()

  // Calculate statistics
  const todayAttendance = attendanceRecords.filter(
    (record) => record.timestamp.toDateString() === new Date().toDateString(),
  )

  const attendanceByEvent = events.map((event) => ({
    event,
    count: attendanceRecords.filter((record) => record.eventName === event.name).length,
  }))

  const attendanceByStudent = students.map((student) => ({
    student,
    count: attendanceRecords.filter((record) => record.studentId === student.id).length,
  }))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Отчеты и экспорт</h1>
          <p className="text-muted-foreground">Просматривайте статистику посещаемости и экспортируйте данные</p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего учеников</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{students.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего мероприятий</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{events.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего отметок</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{attendanceRecords.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Сегодня отметок</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{todayAttendance.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Google Sheets Export */}
        <GoogleSheetsExport />

        {/* Attendance by Event */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Посещаемость по мероприятиям</CardTitle>
            <CardDescription>Статистика посещений для каждого мероприятия</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceByEvent.map(({ event, count }) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.date.toLocaleDateString("ru-RU")}
                      {event.isActive && <Badge className="ml-2">Активно</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-primary">{count}</div>
                    <div className="text-xs text-muted-foreground">посещений</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Последние отметки</CardTitle>
            <CardDescription>Недавние записи посещаемости</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length > 0 ? (
              <div className="space-y-2">
                {attendanceRecords
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .slice(0, 10)
                  .map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{record.studentName}</div>
                        <div className="text-sm text-muted-foreground">{record.eventName}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{record.timestamp.toLocaleString("ru-RU")}</div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Пока нет записей о посещаемости</div>
            )}
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">← Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
