import type { Student, AttendanceRecord, Event } from "./types"

// In-memory storage (in production, this would be replaced with a real database)
const students: Student[] = [
  {
    id: "1",
    name: "Иван Петров",
    group: "ИТ-21",
    course: 3,
    specialty: "Информационные технологии",
    qrCode: "STU001",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Мария Сидорова",
    group: "ИТ-21",
    course: 3,
    specialty: "Информационные технологии",
    qrCode: "STU002",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "3",
    name: "Алексей Иванов",
    group: "ПИ-22",
    course: 2,
    specialty: "Программирование в компьютерных системах",
    qrCode: "STU003",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "4",
    name: "Елена Козлова",
    group: "ИБ-20",
    course: 4,
    specialty: "Информационная безопасность",
    qrCode: "STU004",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "5",
    name: "Дмитрий Волков",
    group: "ПИ-23",
    course: 1,
    specialty: "Программирование в компьютерных системах",
    qrCode: "STU005",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "6",
    name: "Анна Смирнова",
    group: "ИТ-22",
    course: 2,
    specialty: "Информационные технологии",
    qrCode: "STU006",
    createdAt: new Date("2024-01-15"),
  },
]

const attendanceRecords: AttendanceRecord[] = []

const events: Event[] = [
  {
    id: "1",
    name: "Хакатон по веб-разработке",
    date: new Date(),
    description: "Соревнование по созданию веб-приложений",
    isActive: true,
  },
  {
    id: "2",
    name: "Лекция по кибербезопасности",
    date: new Date(Date.now() + 86400000),
    description: "Внеклассная лекция о современных угрозах в IT",
    isActive: false,
  },
]

// Student management functions
export const getAllStudents = (): Student[] => {
  return [...students]
}

export const getStudentById = (id: string): Student | undefined => {
  return students.find((student) => student.id === id)
}

export const getStudentByQRCode = (qrCode: string): Student | undefined => {
  return students.find((student) => student.qrCode === qrCode)
}

export const addStudent = (student: Omit<Student, "id" | "createdAt">): Student => {
  const newStudent: Student = {
    ...student,
    id: Date.now().toString(),
    createdAt: new Date(),
  }
  students.push(newStudent)
  return newStudent
}

export const updateStudent = (id: string, updates: Partial<Student>): Student | null => {
  const index = students.findIndex((student) => student.id === id)
  if (index === -1) return null

  students[index] = { ...students[index], ...updates }
  return students[index]
}

export const deleteStudent = (id: string): boolean => {
  const index = students.findIndex((student) => student.id === id)
  if (index === -1) return false

  students.splice(index, 1)
  return true
}

// Attendance management functions
export const getAllAttendanceRecords = (): AttendanceRecord[] => {
  return [...attendanceRecords]
}

export const addAttendanceRecord = (record: Omit<AttendanceRecord, "id">): AttendanceRecord => {
  const newRecord: AttendanceRecord = {
    ...record,
    id: Date.now().toString(),
  }
  attendanceRecords.push(newRecord)
  return newRecord
}

export const getAttendanceByEvent = (eventName: string): AttendanceRecord[] => {
  return attendanceRecords.filter((record) => record.eventName === eventName)
}

export const getAttendanceByStudent = (studentId: string): AttendanceRecord[] => {
  return attendanceRecords.filter((record) => record.studentId === studentId)
}

// Event management functions
export const getAllEvents = (): Event[] => {
  return [...events]
}

export const getActiveEvent = (): Event | undefined => {
  return events.find((event) => event.isActive)
}

export const addEvent = (event: Omit<Event, "id">): Event => {
  const newEvent: Event = {
    ...event,
    id: Date.now().toString(),
  }
  events.push(newEvent)
  return newEvent
}

export const setActiveEvent = (eventId: string): boolean => {
  // Deactivate all events
  events.forEach((event) => (event.isActive = false))

  // Activate the selected event
  const event = events.find((e) => e.id === eventId)
  if (event) {
    event.isActive = true
    return true
  }
  return false
}
