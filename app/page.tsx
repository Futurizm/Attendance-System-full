// app/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, QrCode, Calendar, BarChart3, FileSpreadsheet, Settings } from "lucide-react";
import { AttendanceDashboard } from "@/components/attendance-dashboard";
import { getAllAttendanceRecords, getAllStudents, getAllEvents, getActiveEvent } from "@/lib/database";
import Link from "next/link";

export default async function HomePage() {
  const attendanceRecords = await getAllAttendanceRecords();
  const students = await getAllStudents();
  const events = await getAllEvents();
  const activeEvent = await getActiveEvent();

  const todayAttendance = attendanceRecords.filter(
    (record) => record.timestamp.toDateString() === new Date().toDateString(),
  );

  const attendanceRate =
    students.length > 0 && events.length > 0
      ? Math.round((attendanceRecords.length / (students.length * events.length)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Система контроля посещаемости</h1>
        <p className="text-gray-600">Управление посещаемостью внеклассных мероприятий колледжа ИТ с помощью QR-кодов</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Всего студентов</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{students.length}</div>
            <p className="text-xs text-gray-500">
              {students.length > 0 ? "Зарегистрированы в системе" : "Добавьте студентов"}
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
              Отметить посещение студента сканированием QR-кода
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
              Управление студентами
            </CardTitle>
            <CardDescription className="text-gray-600">Добавить, редактировать или удалить студентов</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/students">
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              >
                Управлять студентами
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