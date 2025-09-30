"use server";

import type { Student, AttendanceRecord, Event, School, User, AnalyticsData } from "./types";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function getAllStudents(token: string): Promise<Student[]> {
  console.log("Fetching all students with token:", token);
  const res = await fetch(`${API_URL}/students`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  console.log("Response status for getAllStudents:", res.status);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching students:", errorData);
    throw new Error(`Error fetching students: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const students = await res.json();
  return students.map((student: any) => ({
    id: student._id,
    name: student.name,
    group: student.group,
    course: student.course,
    specialty: student.specialty,
    qr_code: student.qr_code,
    school_id: student.school_id,
    createdAt: new Date(student.created_at),
  }));
}

export async function getStudentById(id: string, token: string): Promise<Student | null> {
  const res = await fetch(`${API_URL}/students/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching student by ID:", errorData);
    throw new Error(`Error fetching student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const student = await res.json();
  return {
    id: student._id,
    name: student.name,
    group: student.group,
    course: student.course,
    specialty: student.specialty,
    school_id: student.school_id,
    qr_code: student.qr_code,
    createdAt: new Date(student.created_at),
  };
}

export async function getStudentByqr_code(qr_code: string, token: string): Promise<Student | null> {
  console.log("Fetching student by QR code:", qr_code, "with token:", token.slice(0, 10) + "...");
  const res = await fetch(`${API_URL}/students/qr/${qr_code}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  console.log("Response status for getStudentByQRCode:", res.status);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching student by QR:", errorData);
    throw new Error(`Error fetching student by QR: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const student = await res.json();
  console.log("Fetched student by QR:", student);
  return {
    id: student._id,
    name: student.name,
    group: student.group,
    course: student.course,
    specialty: student.specialty,
    qr_code: student.qr_code,
    school_id: student.school_id,
    createdAt: new Date(student.created_at),
  };
}

export async function addStudent(student: Omit<Student, "id" | "createdAt"> & { school_id?: string }, token: string): Promise<Student | null> {
  const res = await fetch(`${API_URL}/students`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(student), // Теперь включает school_id если передан
  });
  console.log("Response status:", res.status);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Backend error:", errorData);
    throw new Error(`Error adding student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const addedStudent = await res.json();
  console.log("Added student:", addedStudent);
  return {
    id: addedStudent._id,
    name: addedStudent.name,
    group: addedStudent.group,
    course: addedStudent.course,
    specialty: addedStudent.specialty,
    qr_code: addedStudent.qr_code,
    school_id: addedStudent.school_id?._id || addedStudent.school_id,  // Поддержка populate
    createdAt: new Date(addedStudent.created_at),
  };
}

export async function updateStudent(id: string, updates: Partial<Omit<Student, "id" | "createdAt">>, token: string): Promise<Student | null> {
  console.log("Updating student with data:", JSON.stringify(updates, null, 2));
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error updating student:", errorData);
    throw new Error(`Error updating student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const updatedStudent = await res.json();
  return {
    id: updatedStudent._id,
    name: updatedStudent.name,
    group: updatedStudent.group,
    course: updatedStudent.course,
    specialty: updatedStudent.specialty,
    qr_code: updatedStudent.qr_code,
    school_id: updatedStudent.school_id?._id || updatedStudent.school_id,
    createdAt: new Date(updatedStudent.created_at),
  };
}

export async function deleteStudent(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting student:", errorData);
    throw new Error(`Error deleting student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAllAttendanceRecords(token: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`${API_URL}/attendance`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching attendance records:", errorData);
    throw new Error(`Error fetching attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function addAttendanceRecord(record: Omit<AttendanceRecord, "id">, token: string): Promise<AttendanceRecord | null> {
  console.log("Sending attendance record:", record);
  const res = await fetch(`${API_URL}/attendance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      student_id: record.student_id,
      event_name: record.event_name,
      timestamp: record.timestamp,
      scanned_by: record.scanned_by,
      studentName: record.studentName,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error adding attendance:", errorData);
    throw new Error(`Error adding attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const addedRecord = await res.json();
  return {
    id: addedRecord._id,
    student_id: addedRecord.student_id,
    event_name: addedRecord.event_name,
    timestamp: new Date(addedRecord.timestamp),
    scanned_by: addedRecord.scanned_by,
    studentName: addedRecord.studentName,
  };
}

export async function checkAttendanceExists(studentId: string, eventName: string, token: string): Promise<boolean> {
  try {
    console.log(`Checking attendance for studentId: ${studentId}, eventName: ${eventName}`);
    const res = await fetch(`${API_URL}/attendance/check?studentId=${studentId}&eventName=${eventName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      console.error("Error checking attendance:", errorData);
      throw new Error(`Error checking attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
    }
    const result = await res.json();
    console.log("Attendance check result:", result);
    return result;
  } catch (err) {
    console.error("Error in checkAttendanceExists:", err);
    throw err;
  }
}

export async function getAttendanceByEvent(eventName: string, token: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`${API_URL}/attendance/event/${eventName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching attendance by event:", errorData);
    throw new Error(`Error fetching attendance by event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function getAttendanceByStudent(studentId: string, token: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`${API_URL}/attendance/student/${studentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching attendance by student:", errorData);
    throw new Error(`Error fetching attendance by student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function deleteAttendanceRecord(recordId: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/attendance/${recordId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting attendance record:", errorData);
    throw new Error(`Error deleting attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAllEvents(token: string): Promise<Event[]> {
  const res = await fetch(`${API_URL}/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching events:", errorData);
    throw new Error(`Error fetching events: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const events = await res.json();
  return events.map((event: any) => ({
    id: event._id,
    name: event.name,
    date: new Date(event.date),
    description: event.description,
    is_active: event.is_active,
    school_id: event.school_id,
  }));
}

export async function getActiveEvents(token: string): Promise<Event[]> {
  const res = await fetch(`${API_URL}/events/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching active events:", errorData);
    throw new Error(`Error fetching active events: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const events = await res.json();
  return events.map((event: any) => ({
    id: event._id,
    name: event.name,
    date: new Date(event.date),
    description: event.description,
    is_active: event.is_active,
    school_id: event.school_id,
  }));
}

export async function addEvent(event: Omit<Event, "id">, token: string): Promise<Event | null> {
  console.log("Sending event to backend:", JSON.stringify(event, null, 2));
  const res = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error adding event:", errorData);
    throw new Error(`Error adding event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const addedEvent = await res.json();
  return {
    id: addedEvent._id,
    name: addedEvent.name,
    date: new Date(addedEvent.date),
    description: addedEvent.description,
    is_active: addedEvent.is_active,
    school_id: addedEvent.school_id,
  };
}

export async function toggleEventActive(eventId: string, isActive: boolean, token: string): Promise<boolean> {
  console.log(`Sending PUT to ${API_URL}/events/${eventId}/toggle-active with is_active: ${isActive}`);
  const res = await fetch(`${API_URL}/events/${eventId}/toggle-active`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Backend error in toggleEventActive:", errorData);
    throw new Error(`Error toggling event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getActiveEvent(token: string): Promise<Event | null> {
  const events = await getActiveEvents(token);
  return events[0] || null;
}

export async function setActiveEvent(eventId: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/events/${eventId}/toggle-active`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_active: true }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error setting active event:", errorData);
    throw new Error(`Error setting active event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAllSchools(token: string): Promise<School[]> {
  const res = await fetch(`${API_URL}/api/schools`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching schools:", errorData);
    throw new Error(`Error fetching schools: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const schools = await res.json();
  return schools.map((school: any) => ({
    id: school._id,
    name: school.name,
    createdAt: new Date(school.created_at),
  }));
}

export async function addSchool(name: string, token: string): Promise<School | null> {
  const res = await fetch(`${API_URL}/api/schools`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error adding school:", errorData);
    throw new Error(`Error adding school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const addedSchool = await res.json();
  return {
    id: addedSchool._id,
    name: addedSchool.name,
    createdAt: new Date(addedSchool.created_at),
  };
}

export async function updateSchool(id: string, name: string, token: string): Promise<School | null> {
  const res = await fetch(`${API_URL}/api/schools/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error updating school:", errorData);
    throw new Error(`Error updating school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const updatedSchool = await res.json();
  return {
    id: updatedSchool._id,
    name: updatedSchool.name,
    createdAt: new Date(updatedSchool.created_at),
  };
}

export async function deleteSchool(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/schools/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting school:", errorData);
    throw new Error(`Error deleting school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAllUsers(token: string, schoolId?: string, role?: string): Promise<User[]> {
  let url = `${API_URL}/api/users`;
  if (schoolId) url += `?school_id=${schoolId}`;
  if (role) url += `${schoolId ? '&' : '?'}role=${role}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching users:", errorData);
    throw new Error(`Error fetching users: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const users = await res.json();
  return users.map((user: any) => ({
    id: user._id,
    email: user.email,
    role: user.role,
    school_id: user.school_id?._id,
    school: user.school_id ? { id: user.school_id._id, name: user.school_id.name } : undefined,
    createdAt: new Date(user.created_at),
  }));
}

export async function addUser(user: { email: string; password: string; role: string; school_id?: string }, token: string): Promise<User | null> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error adding user:", errorData);
    throw new Error(`Error adding user: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return null; // Backend returns { message: 'User registered' }
}

export async function deleteUser(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting user:", errorData);
    throw new Error(`Error deleting user: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAnalytics(token: string): Promise<AnalyticsData> {
  const res = await fetch(`${API_URL}/api/analytics`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching analytics:", errorData);
    throw new Error(`Error fetching analytics: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const data = await res.json();
  return {
    totalUsers: data.totalUsers,
    usersByRole: {
      teachers: data.usersByRole.teachers,
      parents: data.usersByRole.parents,
      students: data.usersByRole.students,
      schoolAdmins: data.usersByRole.schoolAdmins.map((admin: any) => ({
        id: admin._id,
        email: admin.email,
        school: admin.school,
      })),
      mainAdmins: data.usersByRole.mainAdmins,
    },
    totalSchools: data.totalSchools,
    totalStudents: data.totalStudents,
    totalEvents: data.totalEvents,
    totalAttendance: data.totalAttendance,
    attendanceBySchool: data.attendanceBySchool,
  };
}

export async function getUsersBySchoolAndRole(schoolId: string, role: string, token: string): Promise<User[]> {
  const res = await fetch(`${API_URL}/api/users?school_id=${schoolId}&role=${role}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching users: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const users = await res.json();
  return users.map((user: any) => ({
    id: user._id,
    email: user.email,
    role: user.role,
    school_id: user.school_id?._id,
    school: user.school_id ? { id: user.school_id._id, name: user.school_id.name } : undefined,
    createdAt: new Date(user.created_at),
  }));
}

export async function getStudentsBySchool(schoolId: string, token: string): Promise<Student[]> {
  const res = await fetch(`${API_URL}/students?school_id=${schoolId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching students: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const students = await res.json();
  return students.map((student: any) => ({
    id: student._id,
    name: student.name,
    group: student.group,
    course: student.course,
    specialty: student.specialty,
    qr_code: student.qr_code,
    school_id: student.school_id,
    createdAt: new Date(student.created_at),
  }));
}

export async function getEventsBySchool(schoolId: string, token: string): Promise<Event[]> {
  const res = await fetch(`${API_URL}/events?school_id=${schoolId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching events: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const events = await res.json();
  return events.map((event: any) => ({
    id: event._id,
    name: event.name,
    date: new Date(event.date),
    description: event.description,
    is_active: event.is_active,
    school_id: event.school_id,
  }));
}

export async function getAttendanceBySchool(schoolId: string, token: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`${API_URL}/attendance?school_id=${schoolId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function getSchoolById(id: string, token: string): Promise<School> {
  const res = await fetch(`${API_URL}/api/schools/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const schoolData = await res.json();
  return {
    id: schoolData._id,
    name: schoolData.name,
    createdAt: new Date(schoolData.created_at),
  };
}