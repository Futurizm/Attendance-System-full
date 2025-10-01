export type UserRole = 'teacher' | 'parent' | 'student' | 'school_admin' | 'main_admin';

export interface Student {
  id: string;
  name: string;
  group: string; // Группа (например, "ИТ-21", "ПИ-22")
  course: number; // Курс от 1 до 4
  specialty: string; // Специальность (например, "Информационные технологии", "Программирование")
  qr_code: string;
  school_id: string; // ID школы (обязательно для привязки студента)
  createdAt: Date;
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
  id: string;
  name: string;
  date: Date;
  description?: string;
  is_active: boolean;
  school_id: string;
  teacher_id?: string; // Ensure this is included
}

export interface School {
  id: string;
  name: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  school_id?: string; // Optional for main_admin, required for school_admin
  school?: { id: string; name: string };
  createdAt: Date;
}

export interface AnalyticsData {
  totalUsers: number;
  usersByRole: {
    teachers: number;
    parents: number;
    students: number;
    schoolAdmins: { id: string; email: string; school: string | null }[];
    mainAdmins: number;
  };
  totalSchools: number;
  totalStudents: number;
  totalEvents: number;
  totalAttendance: number;
  attendanceBySchool: { school: string; attendanceCount: number }[];
}