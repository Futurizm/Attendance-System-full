"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock, LogOut } from "lucide-react";
import Link from "next/link";
import { QRScanner } from "@/components/qr-scanner";
import type { Event, AttendanceRecord } from "@/lib/types";
import { toast } from "sonner";
import { getActiveEvents, getAttendanceByEvent } from "@/lib/database";

export default function ScannerPage() {
  const router = useRouter();
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      try {
        const activeEvents = await getActiveEvents(token);
        console.log("ScannerPage: Fetched active events:", activeEvents);
        setActiveEvents(activeEvents);

        if (activeEvents.length > 0 && !selectedEvent) {
          setSelectedEvent(activeEvents[0].id);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendancePromises = activeEvents.map(async (event) => ({
          eventName: event.name,
          records: await getAttendanceByEvent(event.name, token),
        }));
        const attendanceData = await Promise.all(attendancePromises);
        const allRecords = attendanceData.flatMap(({ records }) => records);
        const todayRecords = allRecords.filter(
          (record) => new Date(record.timestamp).toDateString() === today.toDateString()
        );
        setTodayAttendance(todayRecords);
      } catch (error: any) {
        console.error("Error loading data:", error.message);
        toast.error("Ошибка при загрузке данных: " + (error.message || "Неизвестная ошибка"));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router, selectedEvent]);

  const handleScanSuccess = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadData(); // Refresh attendance records after a successful scan
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Сканер посещаемости</h1>
            <p className="text-muted-foreground">Отметьте посещение студентов сканированием QR-кодов</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>

        {/* Active Events Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Выберите мероприятие
            </CardTitle>
            <CardDescription>Выберите активное мероприятие для сканирования QR-кодов</CardDescription>
          </CardHeader>
          <CardContent>
            {activeEvents.length > 0 ? (
              <div className="space-y-4">
                <Select
                  value={selectedEvent || ""}
                  onValueChange={setSelectedEvent}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Выберите мероприятие" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} ({new Date(event.date).toLocaleString("ru-RU")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEvent && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {activeEvents.find((e) => e.id === selectedEvent)?.name}
                      </h3>
                      <Badge variant="default">Активно</Badge>
                    </div>
                    <p className="text-muted-foreground mb-2">
                      {activeEvents.find((e) => e.id === selectedEvent)?.description || "Нет описания"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(
                          activeEvents.find((e) => e.id === selectedEvent)?.date || new Date()
                        ).toLocaleString("ru-RU")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Отмечено сегодня: {
                          todayAttendance.filter(
                            (r) => r.event_name === activeEvents.find((e) => e.id === selectedEvent)?.name
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Нет активных мероприятий. Пожалуйста, активируйте мероприятие на странице управления событиями.
                </p>
                <Link href="/events">
                  <Button variant="outline">Перейти к управлению мероприятиями</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Scanner */}
        {selectedEvent && activeEvents.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Сканировать QR-код</CardTitle>
              <CardDescription>
                Сканируйте QR-код студента для отметки посещения на мероприятии
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QRScanner
                onScanSuccess={handleScanSuccess}
                selectedEvent={activeEvents.find((e) => e.id === selectedEvent)}
              />
            </CardContent>
          </Card>
        )}

        {/* Today's Attendance */}
        {todayAttendance.length > 0 && selectedEvent && (
          <Card>
            <CardHeader>
              <CardTitle>Сегодняшние отметки</CardTitle>
              <CardDescription>Последние отмеченные студенты для выбранного мероприятия</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todayAttendance
                  .filter((record) => record.event_name === activeEvents.find((e) => e.id === selectedEvent)?.name)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 5)
                  .map((record, index) => (
                    <div key={record.id + index} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <div className="font-medium">{record.studentName}</div>
                        <div className="text-sm text-muted-foreground">{record.event_name}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleTimeString("ru-RU")}
                      </div>
                    </div>
                  ))}
              </div>
              {todayAttendance.filter(
                (r) => r.event_name === activeEvents.find((e) => e.id === selectedEvent)?.name
              ).length > 5 && (
                <div className="mt-4 text-center">
                  <Link href="/reports">
                    <Button variant="outline" size="sm">
                      Посмотреть все (
                      {todayAttendance.filter(
                        (r) => r.event_name === activeEvents.find((e) => e.id === selectedEvent)?.name
                      ).length}
                      )
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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