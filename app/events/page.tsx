import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Users, Settings } from "lucide-react"
import { getAllEvents, getAttendanceByEvent } from "@/lib/database"
import Link from "next/link"

export default function EventsPage() {
  const events = getAllEvents()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Управление мероприятиями</h1>
            <p className="text-muted-foreground">Создавайте и управляйте внеклассными мероприятиями</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать мероприятие
          </Button>
        </div>

        {/* Events List */}
        <div className="grid gap-4">
          {events.map((event) => {
            const attendance = getAttendanceByEvent(event.name)
            return (
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
                        Посещений: {attendance.length}
                      </div>
                    </div>
                    {!event.isActive && (
                      <Button variant="outline" size="sm">
                        Активировать
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

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
