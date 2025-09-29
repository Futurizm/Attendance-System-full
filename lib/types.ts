export interface Student {
  id: string
  name: string
  group: string // Группа (например, "ИТ-21", "ПИ-22")
  course: number // Курс от 1 до 4
  specialty: string // Специальность (например, "Информационные технологии", "Программирование")
  qr_code: string
  createdAt: Date
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  studentName: string;
  event_name: string;
  timestamp: Date;
  scanned_by: string;
}

export interface Event {
  id: string
  name: string
  date: Date
  description?: string
  is_active: boolean
}