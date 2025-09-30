"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Users, Trash2, LogOut } from "lucide-react";
import { getAllEvents, getAttendanceByEvent, addEvent, toggleEventActive, deleteAttendanceRecord } from "@/lib/database";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Event, AttendanceRecord } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: "",
    description: "",
    is_active: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchEventsAndAttendance = async () => {
      setIsLoading(true);
      try {
        const fetchedEvents = await getAllEvents(token);
        console.log("Fetched events:", fetchedEvents);
        const attendancePromises = fetchedEvents.map(async (event) => ({
          eventName: event.name,
          attendance: await getAttendanceByEvent(event.name, token),
        }));
        const attendanceData = await Promise.all(attendancePromises);
        const newAttendanceMap = new Map(attendanceData.map(({ eventName, attendance }) => [eventName, attendance]));
        setEvents(fetchedEvents);
        setAttendanceMap(newAttendanceMap);
      } catch (error: any) {
        console.error("Error fetching events and attendance:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить мероприятия или посещаемость",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchEventsAndAttendance();
  }, [router]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    console.log("handleCreateEvent called with:", newEvent);
    try {
      const eventToAdd = {
        name: newEvent.name,
        date: new Date(newEvent.date),
        description: newEvent.description,
        is_active: newEvent.is_active,
      };
      const addedEvent = await addEvent(eventToAdd, token);
      if (addedEvent) {
        console.log("Event added:", addedEvent);
        setEvents((prev) => {
          const updatedEvents = [addedEvent, ...prev];
          console.log("Updated events state:", updatedEvents);
          return updatedEvents;
        });
        setAttendanceMap((prev) => new Map(prev).set(addedEvent.name, []));
        toast({
          title: "Успех",
          description: "Мероприятие успешно создано",
        });
        setIsCreateDialogOpen(false);
        setNewEvent({ name: "", date: "", description: "", is_active: false });
      } else {
        throw new Error("Failed to add event");
      }
    } catch (error: any) {
      console.error("Error in handleCreateEvent:", error);
      toast({
        title: "Ошибка",
        description: `Произошла ошибка при создании мероприятия: ${error.message || "Неизвестная ошибка"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEventActive = async (eventId: string, currentActive: boolean) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    console.log(`Attempting to toggle event ${eventId} to ${!currentActive}`);
    if (!eventId || eventId === "undefined") {
      console.error("Invalid eventId:", eventId);
      toast({
        title: "Ошибка",
        description: "Недействительный ID мероприятия",
        variant: "destructive",
      });
      return;
    }
    try {
      const success = await toggleEventActive(eventId, !currentActive, token);
      console.log("toggleEventActive result:", success);
      if (success) {
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId ? { ...event, is_active: !currentActive } : event
          )
        );
        toast({
          title: "Успех",
          description: `Мероприятие ${currentActive ? "деактивировано" : "активировано"}`,
        });
      } else {
        throw new Error("Failed to toggle event active status");
      }
    } catch (error: any) {
      console.error("Error in handleToggleEventActive:", error);
      toast({
        title: "Ошибка",
        description: `Произошла ошибка при ${currentActive ? "деактивации" : "активации"} мероприятия: ${error.message || "Неизвестная ошибка"}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAttendance = async (recordId: string, eventName: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const success = await deleteAttendanceRecord(recordId, token);
      if (success) {
        setAttendanceMap((prev) => {
          const newMap = new Map(prev);
          const updatedAttendance = newMap.get(eventName)?.filter((record) => record.id !== recordId) || [];
          newMap.set(eventName, updatedAttendance);
          return newMap;
        });
        toast({
          title: "Успех",
          description: "Запись о посещении удалена",
        });
      } else {
        throw new Error("Failed to delete attendance record");
      }
    } catch (error: any) {
      console.error("Error deleting attendance:", error);
      toast({
        title: "Ошибка",
        description: `Произошла ошибка при удалении записи: ${error.message || "Неизвестная ошибка"}`,
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const openDetailsDialog = (event: Event) => {
    console.log("Opening details for event:", event);
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Управление мероприятиями</h1>
            <p className="text-muted-foreground">Создавайте и управляйте внеклассными мероприятиями</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" disabled={isSubmitting}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать мероприятие
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Создать новое мероприятие</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название</Label>
                    <Input
                      id="name"
                      value={newEvent.name}
                      onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Дата</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="is_active">Активно</Label>
                    <Input
                      id="is_active"
                      type="checkbox"
                      checked={newEvent.is_active}
                      onChange={(e) => setNewEvent({ ...newEvent, is_active: e.target.checked })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Отмена
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Создание..." : "Создать"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="text-center">Загрузка мероприятий...</div>
        ) : events.length === 0 ? (
          <div className="text-center text-muted-foreground">Нет мероприятий</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                onClick={() => openDetailsDialog(event)}
              >
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{event.name}</CardTitle>
                        {event.description && (
                          <CardDescription className="mt-1 text-sm line-clamp-2">{event.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-2 flex-shrink-0">
                      {event.is_active && <Badge variant="default">Активно</Badge>}
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEventActive(event.id, event.is_active);
                        }}
                      >
                        {event.is_active ? "Деактивировать" : "Активировать"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-muted-foreground">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {event.date.toLocaleString("ru-RU")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Посещений: {attendanceMap.get(event.name)?.length || 0}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Event Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.name}</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Дата:</strong> {selectedEvent.date.toLocaleString("ru-RU")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Описание:</strong> {selectedEvent.description || "Нет описания"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Статус:</strong> {selectedEvent.is_active ? "Активно" : "Неактивно"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Посещений:</strong> {attendanceMap.get(selectedEvent.name)?.length || 0}
                  </p>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold">Посетившие студенты</h3>
                  {attendanceMap.get(selectedEvent.name)?.length ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30%]">Студент</TableHead>
                            <TableHead className="w-[30%]">Время</TableHead>
                            <TableHead className="w-[20%]">Сканировал</TableHead>
                            <TableHead className="w-[20%]">Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceMap.get(selectedEvent.name)?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="truncate">{record.studentName}</TableCell>
                              <TableCell>{record.timestamp.toLocaleString("ru-RU")}</TableCell>
                              <TableCell>{record.scanned_by}</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="whitespace-nowrap"
                                  onClick={() => handleDeleteAttendance(record.id, selectedEvent.name)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Удалить
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Нет записей о посещении</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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