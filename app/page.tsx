"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, QrCode, Calendar, BarChart3, FileSpreadsheet, Settings, LogOut } from "lucide-react";
import { AttendanceDashboard } from "@/components/attendance-dashboard";
import { getAllAttendanceRecords, getAllStudents, getAllEvents, getActiveEvent } from "@/lib/database";
import Link from "next/link";
import {jwtDecode} from "jwt-decode";

export default function HomePage() {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const decoded: any = jwtDecode(token);
    setRole(decoded.role);

    if (decoded.role !== "school_admin" && decoded.role !== "main_admin" && decoded.role !== "teacher" && decoded.role !== "parent") {
      router.push("/profile");
      return;
    }

    if (decoded.role === "teacher") {
      router.push("/profile/teacher");
      return;
    }

    if (decoded.role === "parent") {
      router.push("/profile/parent");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedAttendance, fetchedStudents, fetchedEvents, fetchedActiveEvent] = await Promise.all([
          getAllAttendanceRecords(token),
          getAllStudents(token),
          getAllEvents(token),
          getActiveEvent(token),
        ]);
        setAttendanceRecords(fetchedAttendance);
        setStudents(fetchedStudents);
        setEvents(fetchedEvents);
        setActiveEvent(fetchedActiveEvent);
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

  const attendanceRate =
    students.length > 0 && events.length > 0
      ? Math.round((attendanceRecords.length / (students.length * events.length)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Система контроля посещаемости</h1>
            <p className="text-gray-600">Управление посещаемостью внеклассных мероприятий/кружков/секций школы с помощью QR-кодов</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Всего школьников</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{students.length}</div>
            <p className="text-xs text-gray-500">
              {students.length > 0 ? "Зарегистрированы в системе" : "Добавьте школьников"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Активных событий</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeEvent ? 1 : 0}</div>
            <p className="text-xs text-gray-500">
              {activeEvent ? `Активно: ${activeEvent.name}` : "Нет активных мероприятий"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Сегодня отметок</CardTitle>
            <QrCode className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{todayAttendance.length}</div>
            <p className="text-xs text-gray-500">
              {todayAttendance.length > 0 ? "Есть активность" : "Пока нет отметок"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Общая посещаемость</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{attendanceRate}%</div>
            <p className="text-xs text-gray-500">{attendanceRate > 0 ? "От максимально возможной" : "Нет данных"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <QrCode className="h-5 w-5 text-blue-600" />
              Сканировать QR-код
            </CardTitle>
            <CardDescription className="text-gray-600">
              Отметить посещение школьника сканированием QR-кода
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/scanner">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Открыть сканер</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-blue-600" />
              Управление школьниками
            </CardTitle>
            <CardDescription className="text-gray-600">Добавить, редактировать или удалить школьников</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/students">
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              >
                Управлять школьниками
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Отчеты и экспорт
            </CardTitle>
            <CardDescription className="text-gray-600">Просмотр статистики и экспорт данных</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports">
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              >
                Посмотреть отчеты
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Calendar className="h-5 w-5 text-blue-600" />
              Управление событиями
            </CardTitle>
            <CardDescription className="text-gray-600">Создать и управлять внеклассными мероприятиями</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/events">
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              >
                Управлять событиями
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Google Sheets
            </CardTitle>
            <CardDescription className="text-gray-600">Экспорт данных в Google Sheets</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports">
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              >
                Экспорт данных
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Settings className="h-5 w-5 text-blue-600" />
              Настройки системы
            </CardTitle>
            <CardDescription className="text-gray-600">Конфигурация и настройки приложения</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full border-gray-300 text-gray-400 bg-transparent" disabled>
              Скоро доступно
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Dashboard */}
      <div className="bg-white rounded-lg border p-6">
        <AttendanceDashboard
          attendanceRecords={attendanceRecords}
          students={students}
          events={events}
        />
      </div>
    </div>
  );
}