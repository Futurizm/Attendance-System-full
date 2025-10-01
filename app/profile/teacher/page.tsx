"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getEventsBySchool, getAttendanceByEvent, getSchoolById } from "@/lib/database";
import type { Event, AttendanceRecord, School } from "@/lib/types";

interface TeacherProfile {
  email: string;
  school_id: string;
  userId: string;
}

export default function TeacherProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      toast.error("Токен не найден. Войдите в систему.");
      router.push("/login");
      return;
    }
    setToken(t);
    try {
      const decoded: any = jwtDecode(t);
      if (decoded.role !== "teacher") {
        toast.error("Доступ запрещён для этой роли");
        router.push("/");
        return;
      }
      setTeacher({
        email: decoded.email,
        school_id: decoded.school_id,
        userId: decoded.userId,
      });
      fetchData(decoded.school_id, decoded.userId, t);
    } catch (err) {
      console.error("Error decoding token:", err);
      toast.error("Ошибка декодирования токена");
      router.push("/login");
    }
  }, [router]);

  const fetchData = async (schoolId: string, teacherId: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch school details
      console.log("Fetching school for ID:", schoolId);
      const schoolData = await getSchoolById(schoolId, t);
      setSchool(schoolData);

      // Fetch events where the teacher is assigned
      const allEvents = await getEventsBySchool(schoolId, t);
      const teacherEvents = allEvents.filter((event) => event.teacher_id === teacherId);
      setEvents(teacherEvents);

      // Fetch attendance for each event
      const attendancePromises = teacherEvents.map(async (event) => ({
        eventName: event.name,
        attendance: await getAttendanceByEvent(event.name, t),
      }));
      const attendanceData = await Promise.all(attendancePromises);
      const newAttendanceMap = new Map(attendanceData.map(({ eventName, attendance }) => [eventName, attendance]));
      setAttendanceMap(newAttendanceMap);
    } catch (err: any) {
      console.error("Error fetching teacher profile data:", {
        message: err.message,
        schoolId,
        token: t.slice(0, 10) + "...",
      });
      setError(err.message);
      toast.error(`Ошибка загрузки профиля: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleRetry = () => {
    if (teacher && token) {
      fetchData(teacher.school_id, teacher.userId, token);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={handleRetry} className="mt-4">
          Повторить
        </Button>
      </div>
    );
  }

  if (!teacher) {
    return <div className="text-center">Профиль не найден</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Профиль преподавателя</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Выйти
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Информация о преподавателе
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Школа:</strong> {school ? school.name : "Не удалось загрузить данные школы"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Назначенные мероприятия
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Посещаемость</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const attendanceRecords = attendanceMap.get(event.name) || [];
                  return (
                    <TableRow key={event.id}>
                      <TableCell>{event.name}</TableCell>
                      <TableCell>{event.date.toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell>{event.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={event.is_active ? "success" : "secondary"}>
                          {event.is_active ? "Активно" : "Неактивно"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attendanceRecords.length} студент(ов)
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground">Нет назначенных мероприятий</p>
          )}
        </CardContent>
      </Card>

      {events.map((event) => (
        <Card key={event.id} className="mt-6">
          <CardHeader>
            <CardTitle>Посещаемость: {event.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceMap.get(event.name)?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Студент</TableHead>
                    <TableHead>Время посещения</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceMap.get(event.name)?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell>{record.timestamp.toLocaleString("ru-RU")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Нет записей о посещаемости</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}