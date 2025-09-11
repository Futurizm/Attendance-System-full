'use client'
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Users, Settings } from "lucide-react"
import { getAllEvents, getAttendanceByEvent, addEvent, toggleEventActive } from "@/lib/database"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import type { Event, AttendanceRecord } from "@/lib/types"

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: "",
    description: "",
    isActive: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Fetch events and attendance on component mount
  useEffect(() => {
    const fetchEventsAndAttendance = async () => {
      setIsLoading(true)
      try {
        const fetchedEvents = await getAllEvents()
        const attendancePromises = fetchedEvents.map(async (event) => ({
          eventName: event.name,
          attendance: await getAttendanceByEvent(event.name),
        }))
        const attendanceData = await Promise.all(attendancePromises)
        const newAttendanceMap = new Map(attendanceData.map(({ eventName, attendance }) => [eventName, attendance]))
        setEvents(fetchedEvents)
        setAttendanceMap(newAttendanceMap)
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить мероприятия или посещаемость",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchEventsAndAttendance()
  }, [])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const eventToAdd = {
        name: newEvent.name,
        date: new Date(newEvent.date),
        description: newEvent.description,
        isActive: newEvent.isActive,
      }
      const addedEvent = await addEvent(eventToAdd)
      if (addedEvent) {
        setEvents((prev) => [addedEvent, ...prev])
        setAttendanceMap((prev) => new Map(prev).set(addedEvent.name, []))
        toast({
          title: "Успех",
          description: "Мероприятие успешно создано",
        })
        setIsDialogOpen(false)
        setNewEvent({ name: "", date: "", description: "", isActive: false })
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось создать мероприятие",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при создании мероприятия",
        variant: "destructive",
      })
    }
  }

  const handleToggleEventActive = async (eventId: string, currentActive: boolean) => {
    try {
      const success = await toggleEventActive(eventId, !currentActive)
      if (success) {
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId ? { ...event, isActive: !currentActive } : event
          )
        )
        toast({
          title: "Успех",
          description: `Мероприятие ${currentActive ? "деактивировано" : "активировано"}`,
        })
      } else {
        toast({
          title: "Ошибка",
          description: `Не удалось ${currentActive ? "деактивировать" : "активировать"} мероприятие`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: `Произошла ошибка при ${currentActive ? "деактивации" : "активации"} мероприятия`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Управление мероприятиями</h1>
            <p className="text-muted-foreground">Создавайте и управляйте внеклассными мероприятиями</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Создать мероприятие
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                  />
                </div>
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="isActive">Активно</Label>
                  <Input
                    id="isActive"
                    type="checkbox"
                    checked={newEvent.isActive}
                    onChange={(e) => setNewEvent({ ...newEvent, isActive: e.target.checked })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">Создать</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="text-center">Загрузка мероприятий...</div>
        ) : events.length === 0 ? (
          <div className="text-center text-muted-foreground">Нет мероприятий</div>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        {event.description && <CardDescription className="mt-1">{event.description}</CardDescription>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.isActive && <Badge variant="default">Активно</Badge>}
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {event.date.toLocaleString("ru-RU")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Посещений: {attendanceMap.get(event.name)?.length || 0}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleEventActive(event.id, event.isActive)}
                    >
                      {event.isActive ? "Деактивировать" : "Активировать"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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