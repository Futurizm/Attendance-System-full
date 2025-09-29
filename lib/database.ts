"use server";

import type { Student, AttendanceRecord, Event } from "./types";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function getAllStudents() {
  const res = await fetch(`${API_URL}/students`);
  if (!res.ok) throw new Error('Error fetching students');
  const students = await res.json();
  return students.map((student: any) => ({
    ...student,
    id: student._id,
    qrCode: student.qr_code,
  }));
}

export async function getStudentById(id: string) {
  const res = await fetch(`${API_URL}/students/${id}`);
  if (!res.ok) return null;
  const student = await res.json();
  return {
    ...student,
    id: student._id,
    qrCode: student.qr_code,
  };
}

export async function getStudentByQRCode(qrCode: string) {
  const res = await fetch(`${API_URL}/students/qr/${qrCode}`);
  if (!res.ok) return null;
  const student = await res.json();
  return {
    ...student,
    id: student._id,
    qrCode: student.qr_code,
  };
}

export async function addStudent(student: Omit<Student, "id" | "createdAt">) {
  console.log('Sending student to backend:', student);
  const res = await fetch(`${API_URL}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...student, qr_code: student.qr_code }), 
  });
  if (!res.ok) {
    const errorData = await res.json();
    console.error('Backend error:', errorData);
    return null;
  }
  const addedStudent = await res.json();
  return {
    ...addedStudent,
    id: addedStudent._id,
    qrCode: addedStudent.qr_code,
  };
}

export async function updateStudent(id: string, updates: Partial<Omit<Student, "id" | "createdAt">>) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, qr_code: updates.qr_code }), 
  });
  if (!res.ok) return null;
  const updatedStudent = await res.json();
  return {
    ...updatedStudent,
    id: updatedStudent._id,
    qrCode: updatedStudent.qr_code,
  };
}

export async function deleteStudent(id: string) {
  const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function getAllAttendanceRecords() {
  const res = await fetch(`${API_URL}/attendance`);
  if (!res.ok) throw new Error('Error fetching attendance');
  const records = await res.json();
  return records.map((record: any) => ({
    ...record,
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp), // Convert string to Date
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function addAttendanceRecord(record: Omit<AttendanceRecord, "id">) {
  console.log('Sending attendance record:', record);
  const res = await fetch(`${API_URL}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: record.student_id,
      event_name: record.event_name,
      timestamp: record.timestamp,
      scanned_by: record.scanned_by,
      studentName: record.studentName,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    console.error('Error adding attendance:', errorData);
    return null;
  }
  const addedRecord = await res.json();
  return {
    ...addedRecord,
    id: addedRecord._id,
    student_id: addedRecord.student_id,
    event_name: addedRecord.event_name,
    timestamp: new Date(addedRecord.timestamp), // Convert string to Date
    scanned_by: addedRecord.scanned_by,
    studentName: addedRecord.studentName,
  };
}

export async function checkAttendanceExists(studentId: string, eventName: string) {
  try {
    console.log(`Checking attendance for studentId: ${studentId}, eventName: ${eventName}`);
    const res = await fetch(`${API_URL}/attendance/check?studentId=${studentId}&eventName=${eventName}`);
    if (!res.ok) {
      const errorData = await res.json();
      console.error('Error checking attendance:', errorData);
      throw new Error(`Error checking attendance: ${errorData.error || 'Unknown error'}`);
    }
    const result = await res.json();
    console.log('Attendance check result:', result);
    return result;
  } catch (err) {
    console.error('Error in checkAttendanceExists:', err);
    throw err;
  }
}

export async function getAttendanceByEvent(eventName: string) {
  const res = await fetch(`${API_URL}/attendance/event/${eventName}`);
  if (!res.ok) throw new Error('Error fetching attendance by event');
  const records = await res.json();
  return records.map((record: any) => ({
    ...record,
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp), // Convert string to Date
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function deleteAttendanceRecord(recordId: string) {
  const res = await fetch(`${API_URL}/attendance/${recordId}`, { method: 'DELETE' });
  return res.ok;
}

export async function getAllEvents() {
  const res = await fetch(`${API_URL}/events`);
  if (!res.ok) throw new Error('Error fetching events');
  const events = await res.json();
  return events.map((event: any) => ({
    id: event._id,
    name: event.name,
    date: new Date(event.date),
    description: event.description,
    is_active: event.is_active,
  }));
}

export async function getActiveEvents() {
  const res = await fetch(`${API_URL}/events/active`);
  if (!res.ok) throw new Error('Error fetching active events');
  const events = await res.json();
  return events.map((event: any) => ({
    id: event._id,
    name: event.name,
    date: new Date(event.date),
    description: event.description,
    is_active: event.is_active,
  }));
}

export async function addEvent(event: Omit<Event, "id">) {
  const res = await fetch(`${API_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) return null;
  const addedEvent = await res.json();
  return {
    id: addedEvent._id,
    name: addedEvent.name,
    date: new Date(addedEvent.date),
    description: addedEvent.description,
    is_active: addedEvent.is_active,
  };
}

export async function toggleEventActive(eventId: string, isActive: boolean) {
  console.log(`Sending PUT to ${API_URL}/events/${eventId}/toggle-active with is_active: ${isActive}`);
  const res = await fetch(`${API_URL}/events/${eventId}/toggle-active`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    console.error('Backend error in toggleEventActive:', errorData);
    return false;
  }
  return res.ok;
}

export async function getActiveEvent() {
  const events = await getActiveEvents();
  return events[0] || null;
}

export async function getAttendanceByStudent(studentId: string) {
  throw new Error('Not implemented');
}

export async function setActiveEvent(eventId: string) {
  throw new Error('Not implemented');
}