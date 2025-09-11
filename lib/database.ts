import { createBrowserSupabaseClient } from "./supabase-client";
import type { Student, AttendanceRecord, Event } from "./types";

const supabase = createBrowserSupabaseClient();

// Student management functions
export const getAllStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase.from("students").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching students:", error)
    return []
  }

  return data.map((student) => ({
    id: student.id,
    name: student.name,
    group: student.group,
    course: student.course,
    specialty: student.specialty,
    qrCode: student.qr_code,
    createdAt: new Date(student.created_at),
  }))
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  const { data, error } = await supabase.from("students").select("*").eq("id", id).single();

  if (error) {
    console.error("Error fetching student:", error)
    return null
  }

  return {
    id: data.id,
    name: data.name,
    group: data.group,
    course: data.course,
    specialty: data.specialty,
    qrCode: data.qr_code,
    createdAt: new Date(data.created_at),
  }
};

export const getStudentByQRCode = async (qrCode: string): Promise<Student | null> => {
  const { data, error } = await supabase.from("students").select("*").eq("qr_code", qrCode).single();

  if (error) {
    console.error("Error fetching student by QR code:", error)
    return null
  }

  return {
    id: data.id,
    name: data.name,
    group: data.group,
    course: data.course,
    specialty: data.specialty,
    qrCode: data.qr_code,
    createdAt: new Date(data.created_at),
  }
};

export const addStudent = async (student: Omit<Student, "id" | "createdAt">): Promise<Student | null> => {
  const { data, error } = await supabase
    .from("students")
    .insert({
      name: student.name,
      group: student.group,
      course: student.course,
      specialty: student.specialty,
      qr_code: student.qrCode,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding student:", error)
    return null
  }

  return {
    id: data.id,
    name: data.name,
    group: data.group,
    course: data.course,
    specialty: data.specialty,
    qrCode: data.qr_code,
    createdAt: new Date(data.created_at),
  }
};

export const updateStudent = async (id: string, updates: Partial<Omit<Student, "id" | "createdAt">>): Promise<Student | null> => {
  const updateData: any = {}
  if (updates.name) updateData.name = updates.name
  if (updates.group) updateData.group = updates.group
  if (updates.course) updateData.course = updates.course
  if (updates.specialty) updateData.specialty = updates.specialty
  if (updates.qrCode) updateData.qr_code = updates.qrCode

  const { data, error } = await supabase.from("students").update(updateData).eq("id", id).select().single();

  if (error) {
    console.error("Error updating student:", error)
    return null
  }

  return {
    id: data.id,
    name: data.name,
    group: data.group,
    course: data.course,
    specialty: data.specialty,
    qrCode: data.qr_code,
    createdAt: new Date(data.created_at),
  }
};

export const deleteStudent = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) {
    console.error("Error deleting student:", error)
    return false
  }

  return true
};

// Attendance management functions
export const getAllAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      *,
      student:student_id (name)
    `)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Error fetching attendance records:", error)
    return []
  }

  return data.map((record) => ({
    id: record.id,
    studentId: record.student_id,
    studentName: record.student.name,
    eventName: record.event_name,
    timestamp: new Date(record.timestamp),
    scannedBy: record.scanned_by,
  }))
};

export const addAttendanceRecord = async (record: Omit<AttendanceRecord, "id">): Promise<AttendanceRecord | null> => {
  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      student_id: record.studentId,
      event_name: record.eventName,
      timestamp: record.timestamp.toISOString(),
      scanned_by: record.scannedBy,
    })
    .select(`
      *,
      student:student_id (name)
    `)
    .single();

  if (error) {
    console.error("Error adding attendance record:", error)
    return null
  }

  return {
    id: data.id,
    studentId: data.student_id,
    studentName: data.student.name,
    eventName: data.event_name,
    timestamp: new Date(data.timestamp),
    scannedBy: data.scanned_by,
  }
};

export const checkAttendanceExists = async (studentId: string, eventName: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("student_id", studentId)
    .eq("event_name", eventName)
    .limit(1);

  if (error) {
    console.error("Error checking attendance:", error)
    return false
  }

  return data.length > 0
};

export const getAttendanceByEvent = async (eventName: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      *,
      student:student_id (name, group, course)
    `)
    .eq("event_name", eventName)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Error fetching attendance by event:", error)
    return []
  }

  return data.map((record) => ({
    id: record.id,
    studentId: record.student_id,
    studentName: record.student.name,
    eventName: record.event_name,
    timestamp: new Date(record.timestamp),
    scannedBy: record.scanned_by,
  }))
};

export const getAttendanceByStudent = async (studentId: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("student_id", studentId)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Error fetching attendance by student:", error)
    return []
  }

  return data.map((record) => ({
    id: record.id,
    studentId: record.student_id,
    studentName: "", // Fill if needed
    eventName: record.event_name,
    timestamp: new Date(record.timestamp),
    scannedBy: record.scanned_by,
  }))
};

// Event management functions
export const getAllEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase.from("events").select("*").order("date", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data.map((event) => ({
    id: event.id,
    name: event.name,
    date: new Date(event.date),
    description: event.description,
    isActive: event.is_active,
  }))
};

export const getActiveEvents = async (): Promise<Event[]> => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .gte("date", today.toISOString())
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching active events:", error)
    return []
  }

  return data.map((event) => ({
    id: event.id,
    name: event.name,
    date: new Date(event.date),
    description: event.description,
    isActive: event.is_active,
  }))
};

export const addEvent = async (event: Omit<Event, "id">): Promise<Event | null> => {
  const { data, error } = await supabase
    .from("events")
    .insert({
      name: event.name,
      date: event.date.toISOString(),
      description: event.description,
      is_active: event.isActive,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding event:", error)
    return null
  }

  return {
    id: data.id,
    name: data.name,
    date: new Date(data.date),
    description: data.description,
    isActive: data.is_active,
  }
};

export const toggleEventActive = async (eventId: string, isActive: boolean): Promise<boolean> => {
  const { error } = await supabase.from("events").update({ is_active: isActive }).eq("id", eventId);

  if (error) {
    console.error("Error toggling event active status:", error)
    return false
  }

  return true
};