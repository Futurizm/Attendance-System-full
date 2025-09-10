import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QRScanner } from "@/components/qr-scanner"
import { getActiveEvent, getAllAttendanceRecords } from "@/lib/database"
import { Calendar, Users, Clock } from "lucide-react"
import Link from "next/link"

export default function ScannerPage() {
  const activeEvent = getActiveEvent()
  const todayAttendance = getAllAttendanceRecords().filter(
    (record) => record.timestamp.toDateString() === new Date().toDateString(),
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Сканер посещаемости</h1>
          <p className="text-muted-foreground">Отметьте посещение учеников сканированием QR-кодов</p>
        </div>

        {/* Active Event Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Активное мероприятие
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeEvent ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{activeEvent.name}</h3>
                  <Badge variant="default">Активно</Badge>
                </div>
                {activeEvent.description && <p className="text-muted-foreground">{activeEvent.description}</p>}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {activeEvent.date.toLocaleString("ru-RU")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Отмечено сегодня: {todayAttendance.length}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">Нет активного мероприятия</p>
                <Link href="/events">
                  <Button variant="outline">Создать мероприятие</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Scanner */}
        {activeEvent && <QRScanner />}

        {/* Today's Attendance */}
        {todayAttendance.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Сегодняшние отметки</CardTitle>
              <CardDescription>Последние отмеченные ученики</CardDescription>
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
  )
}
