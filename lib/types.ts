export interface Student {
  id: string
  name: string
  group: string // Группа (например, "ИТ-21", "ПИ-22")
  course: number // Курс от 1 до 4
  specialty: string // Специальность (например, "Информационные технологии", "Программирование")
  qrCode: string
  createdAt: Date
}

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  eventName: string
  timestamp: Date
  scannedBy: string
}

export interface Event {
  id: string
  name: string
  date: Date
  description?: string
  isActive: boolean
}