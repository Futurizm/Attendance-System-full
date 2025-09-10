"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Users } from "lucide-react"
import { getAllStudents } from "@/lib/database-supabase"
import { QRCodeDisplay } from "@/components/qr-code-display"
import { BulkQRGenerator } from "@/components/bulk-qr-generator"
import { useEffect, useState } from "react"
import type { Student } from "@/lib/types"

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const data = await getAllStudents()
        setStudents(data)
      } catch (error) {
        console.error("Error loading students:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-white border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Управление студентами</h1>
            <p className="text-gray-600">Добавляйте, редактируйте и управляйте студентами колледжа</p>
          </div>
          <div className="flex gap-2">
            <BulkQRGenerator students={students} />
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Добавить студента
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="Поиск по имени или группе..." className="pl-10 border-gray-300" />
              </div>
            </div>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent">
              Фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <div className="grid gap-4">
        {students.map((student) => (
          <Card key={student.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">
                      {student.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                        {student.group}
                      </Badge>
                      <Badge variant="outline" className="border-blue-200 text-blue-700">
                        {student.course} курс
                      </Badge>
                      <span className="text-sm text-gray-500 truncate">QR: {student.qrCode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <QRCodeDisplay student={student} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {students.length === 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <div className="text-gray-500 mb-4">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет студентов</h3>
              <p className="text-gray-600">Добавьте первого студента для начала работы</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Добавить студента
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
