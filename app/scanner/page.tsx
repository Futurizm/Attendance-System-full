"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock } from "lucide-react";
import Link from "next/link";
import { QRScanner } from "@/components/qr-scanner";
import { getActiveEvents, getAllAttendanceRecords } from "@/lib/database";
import type { Event, AttendanceRecord } from "@/lib/types";
import { toast } from "sonner";

export default function ScannerPage() {
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const events = await getActiveEvents();
      setActiveEvents(events);

      const records = await getAllAttendanceRecords();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRecords = records.filter(
        (record) => record.timestamp.toDateString() === today.toDateString()
      );
      setTodayAttendance(todayRecords);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Ошибка при загрузке данных: " + (error.message || "Неизвестная ошибка"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScanSuccess = () => {
    loadData(); // Refresh attendance records after a successful scan
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Сканер посещаемости</h1>
          <p className="text-muted-foreground">Отметьте посещение студентов сканированием QR-кодов</p>
        </div>

        {/* Active Events List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Активные мероприятия
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeEvents.length > 0 ? (
              <div className="space-y-4">
                {activeEvents.map((event) => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{event.name}</h3>
                      <Badge variant="default">Активно</Badge>
                    </div>
                    {event.description && <p className="text-muted-foreground mb-2">{event.description}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {event.date.toLocaleString("ru-RU")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Отмечено сегодня: {todayAttendance.filter(r => r.eventName === event.name).length}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">Нет активных мероприятий на сегодня или в будущем</p>
                <Link href="/events">
                  <Button variant="outline">Создать мероприятие</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Scanner */}
        {activeEvents.length > 0 && <QRScanner onScanSuccess={handleScanSuccess} />}

        {/* Today's Attendance */}
        {todayAttendance.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Сегодняшние отметки</CardTitle>
              <CardDescription>Последние отмеченные студенты</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todayAttendance
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .slice(0, 5)
                  .map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <div className="font-medium">{record.studentName}</div>
                        <div className="text-sm text-muted-foreground">{record.eventName}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {record.timestamp.toLocaleTimeString("ru-RU")}
                      </div>
                    </div>
                  ))}
              </div>
              {todayAttendance.length > 5 && (
                <div className="mt-4 text-center">
                  <Link href="/reports">
                    <Button variant="outline" size="sm">
                      Посмотреть все ({todayAttendance.length})
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