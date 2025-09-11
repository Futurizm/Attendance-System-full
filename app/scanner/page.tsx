"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock } from "lucide-react";
import Link from "next/link";
import { QRScanner } from "@/components/qr-scanner";
import type { Event, AttendanceRecord } from "@/lib/types";
import { toast } from "sonner";

export default function ScannerPage() {
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const response = await fetch("/api/scanner-data");
      const { success, activeEvents, records, error } = await response.json();

      if (!success) {
        throw new Error(error || "Failed to fetch data");
      }

      console.log("ScannerPage: Fetched active events:", activeEvents);
      setActiveEvents(activeEvents);

      // Set the first active event as default if none selected
      if (activeEvents.length > 0 && !selectedEvent) {
        setSelectedEvent(activeEvents[0].id);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRecords = records.filter(
        (record: AttendanceRecord) => new Date(record.timestamp).toDateString() === today.toDateString(),
      );
      setTodayAttendance(todayRecords);
    } catch (error: any) {
      console.error("Error loading data:", error.message);
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
                            (r) => r.eventName === activeEvents.find((e) => e.id === selectedEvent)?.name
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
                  .filter((record) => record.eventName === activeEvents.find((e) => e.id === selectedEvent)?.name)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 5)
                  .map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <div className="font-medium">{record.studentName}</div>
                        <div className="text-sm text-muted-foreground">{record.eventName}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleTimeString("ru-RU")}
                      </div>
                    </div>
                  ))}
              </div>
              {todayAttendance.filter(
                (r) => r.eventName === activeEvents.find((e) => e.id === selectedEvent)?.name
              ).length > 5 && (
                <div className="mt-4 text-center">
                  <Link href="/reports">
                    <Button variant="outline" size="sm">
                      Посмотреть все (
                      {todayAttendance.filter(
                        (r) => r.eventName === activeEvents.find((e) => e.id === selectedEvent)?.name
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