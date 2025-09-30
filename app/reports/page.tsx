"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { GoogleSheetsExport } from "@/components/google-sheets-export";
import { getAllAttendanceRecords, getAllStudents, getAllEvents } from "@/lib/database";
import { BarChart3, Users, Calendar } from "lucide-react";
import Link from "next/link";
import type { AttendanceRecord, Student, Event } from "@/lib/types";

export default function ReportsPage() {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedAttendance, fetchedStudents, fetchedEvents] = await Promise.all([
          getAllAttendanceRecords(token),
          getAllStudents(token),
          getAllEvents(token),
        ]);
        setAttendanceRecords(fetchedAttendance);
        setStudents(fetchedStudents);
        setEvents(fetchedEvents);
      } catch (error: any) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }

  const todayAttendance = attendanceRecords.filter(
    (record) => record.timestamp.toDateString() === new Date().toDateString()
  );

  const attendanceByEvent = events.map((event) => ({
    event,
    count: attendanceRecords.filter((record) => record.event_name === event.name).length,
  }));

  const attendanceByStudent = students.map((student) => ({
    student,
    count: attendanceRecords.filter((record) => record.student_id === student.id).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Отчеты и экспорт</h1>
            <p className="text-muted-foreground">Просматривайте статистику посещаемости и экспортируйте данные</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium truncate">Всего учеников</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold text-primary">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium truncate">Всего мероприятий</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold text-primary">{events.length}</div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium truncate">Всего отметок</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold text-primary">{attendanceRecords.length}</div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium truncate">Сегодня отметок</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold text-primary">{todayAttendance.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Google Sheets Export */}
        <div className="mb-8">
          <GoogleSheetsExport
            attendanceRecords={attendanceRecords}
            students={students}
            events={events}
          />
        </div>

        {/* Attendance by Event */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Посещаемость по мероприятиям</CardTitle>
            <CardDescription>Статистика посещений для каждого мероприятия</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <div className="space-y-3">
                {attendanceByEvent.map(({ event, count }) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{event.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{event.date.toLocaleDateString("ru-RU")}</span>
                        {event.is_active && <Badge variant="default">Активно</Badge>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-semibold text-primary">{count}</div>
                      <div className="text-xs text-muted-foreground">посещений</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">Нет мероприятий</div>
            )}
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
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{record.studentName}</div>
                        <div className="text-sm text-muted-foreground truncate">{record.event_name}</div>
                      </div>
                      <div className="text-sm text-muted-foreground flex-shrink-0">
                        {record.timestamp.toLocaleString("ru-RU")}
                      </div>
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
  );
}