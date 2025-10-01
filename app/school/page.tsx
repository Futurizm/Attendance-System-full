"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, LogOut, Users, User, Calendar, QrCode, UserCog } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { getUsersBySchoolAndRole, addUser, deleteUser, getStudentsBySchool, addStudent, updateStudent, deleteStudent, getEventsBySchool, addEvent, updateEvent, deleteEvent, toggleEventActive, addChildToParent, getSchoolById, getAttendanceByEvent, deleteAttendanceRecord } from "@/lib/database";
import type { Student, School, Event, AttendanceRecord, User } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Validation schemas
const studentSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  group: z.string().min(1, "Группа обязательна"),
  course: z.number().int().min(1).max(4, "Курс от 1 до 4"),
  specialty: z.string().min(1, "Специальность обязательна"),
  email: z.string().email("Неверный email").min(1, "Email обязателен"),
  password: z.string().min(8, "Пароль минимум 8 символов"),
  qr_code: z.string().min(1, "QR-код обязателен"),
});

const eventSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  date: z.string().min(1, "Дата обязательна"),
  description: z.string().optional(),
  teacher_id: z.string().min(1, "Преподаватель обязателен"),
});

type StudentFormData = z.infer<typeof studentSchema>;
type EventFormData = z.infer<typeof eventSchema> & { teacher_id?: string };
interface SchoolDetail { id: string; name: string; }

// Users Section Component
function UsersSection({ schoolId, role, students }: { schoolId: string; role: string; students: Student[] }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<User | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      fetchUsers(t);
    }
  }, [schoolId, role]);

  const fetchUsers = async (t: string) => {
    try {
      const data = await getUsersBySchoolAndRole(schoolId, role, t);
      setUsers(data);
    } catch (err) {
      console.error(`Error fetching ${role}:`, err);
      toast.error(`Ошибка загрузки ${role === 'teacher' ? 'преподавателей' : role === 'parent' ? 'родителей' : 'админов'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!token) return;
    try {
      await addUser({ email: newEmail, password: newPassword, role, school_id: schoolId }, token);
      await fetchUsers(token);
      setIsDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      toast.success("Пользователь создан");
    } catch (err) {
      console.error("Error creating user:", err);
      toast.error("Ошибка создания пользователя");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!token) return;
    try {
      await deleteUser(id, token);
      await fetchUsers(token);
      toast.success("Пользователь удалён");
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Ошибка удаления");
    }
  };

  const handleAddChild = async () => {
    if (!token || !selectedParent || !selectedStudentId) return;
    try {
      await addChildToParent(selectedParent.id, selectedStudentId, token);
      toast.success("Ребёнок успешно добавлен к родителю");
      setIsAddChildDialogOpen(false);
      setSelectedStudentId("");
      await fetchUsers(token);
    } catch (err) {
      console.error("Error adding child:", err);
      toast.error("Ошибка при добавлении ребёнка");
    }
  };

  const roleIcon = role === 'school_admin' ? UserCog : role === 'teacher' ? QrCode : Users;
  const roleLabel = role === 'teacher' ? 'Преподаватели' : role === 'parent' ? 'Родители' : 'Админы школы';

  if (loading) return <div>Загрузка {roleLabel.toLowerCase()}...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{roleLabel}</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить {roleLabel.toLowerCase()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div>
                <Label>Пароль</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <Button onClick={handleCreateUser}>Создать</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4">
        {users.length > 0 ? (
          users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <roleIcon className="h-4 w-4" />
                  {user.email}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Создан: {user.createdAt.toLocaleDateString("ru-RU")}</p>
                {role === "parent" && (
                  <div className="mt-2">
                    <p className="font-semibold">Дети:</p>
                    {user.children && user.children.length > 0 ? (
                      <ul className="list-disc pl-5">
                        {user.children.map((childId) => {
                          const child = students.find((s) => s.id === childId);
                          return (
                            <li key={childId}>
                              {child ? `${child.name} (${child.group}, ${child.course} курс)` : "Неизвестный студент"}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p>Нет привязанных детей</p>
                    )}
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        setSelectedParent(user);
                        setIsAddChildDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Добавить ребёнка
                    </Button>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => toast.info("Редактирование в разработке")}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Редактировать
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Удалить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>Нет {roleLabel.toLowerCase()} для отображения</p>
        )}
      </div>
      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ребёнка к {selectedParent?.email}</DialogTitle>
            <DialogDescription>Выберите студента для привязки к родителю.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Студент</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите студента" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.group}, {student.course} курс)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddChild} disabled={!selectedStudentId}>
              Добавить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Students Section Component
function StudentsSection({ schoolId }: { schoolId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [qrCodeURL, setQrCodeURL] = useState<string>("");
  const [qrError, setQrError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: "", group: "", course: 1, specialty: "", email: "", password: "", qr_code: "" },
  });

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      loadStudents(t);
    }
  }, [schoolId]);

  const loadStudents = async (t: string) => {
    try {
      setLoading(true);
      const data = await getStudentsBySchool(schoolId, t);
      setStudents(data);
    } catch (error: any) {
      console.error("Error loading students:", error);
      toast.error("Ошибка при загрузке студентов: " + (error.message || "Неизвестная ошибка"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editingStudent) {
      form.reset({
        name: editingStudent.name,
        group: editingStudent.group,
        course: editingStudent.course,
        specialty: editingStudent.specialty,
        email: "",
        password: "",
        qr_code: editingStudent.qr_code,
      });
    } else {
      form.reset({
        name: "",
        group: "",
        course: 1,
        specialty: "",
        email: "",
        password: "",
        qr_code: crypto.randomUUID(),
      });
    }
  }, [editingStudent, form]);

  useEffect(() => {
    if (isAddOpen && form.watch("qr_code")) {
      setQrError(null);
      QRCode.toDataURL(form.watch("qr_code"), { width: 256, margin: 2, errorCorrectionLevel: "H" }, (err, url) => {
        if (err) {
          console.error("QR Code URL Error:", err);
          setQrError("Ошибка генерации QR-кода");
          setQrCodeURL("");
        } else {
          setQrCodeURL(url);
        }
      });
    } else {
      setQrCodeURL("");
      setQrError(null);
    }
  }, [isAddOpen, form.watch("qr_code")]);

  const onSubmit = async (data: StudentFormData) => {
    if (!token) {
      toast.error("Токен не найден. Войдите в систему.");
      return;
    }
    try {
      const studentData = { ...data, school_id: schoolId };
      let updatedStudent: Student | null = null;
      if (editingStudent) {
        updatedStudent = await updateStudent(editingStudent.id, studentData, token);
        if (updatedStudent) toast.success(`Студент ${data.name} успешно обновлен`);
      } else {
        updatedStudent = await addStudent(studentData, token);
        if (updatedStudent) toast.success(`Студент ${data.name} успешно добавлен`);
      }
      if (!updatedStudent) throw new Error("Failed to save student");
      setIsAddOpen(false);
      setEditingStudent(null);
      form.reset({ name: "", group: "", course: 1, specialty: "", email: "", password: "", qr_code: crypto.randomUUID() });
      setQrCodeURL("");
      setTimeout(() => loadStudents(token), 500);
    } catch (error: any) {
      console.error("Error saving student:", error);
      toast.error("Ошибка при сохранении студента: " + (error.message || "Неизвестная ошибка"));
    }
  };

  const handleDelete = async () => {
    if (!token || !deletingStudent) return;
    try {
      const success = await deleteStudent(deletingStudent.id, token);
      if (success) {
        toast.success(`Студент ${deletingStudent.name} успешно удален`);
        setDeletingStudent(null);
        await loadStudents(token);
      } else {
        throw new Error("Failed to delete student");
      }
    } catch (error: any) {
      console.error("Error deleting student:", error);
      toast.error("Ошибка при удалении студента: " + (error.message || "Неизвестная ошибка"));
    }
  };

  if (loading) return <div>Загрузка студентов...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Управление студентами</h2>
            <p className="text-gray-600">Добавляйте, редактируйте и управляйте студентами</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> Добавить студента
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStudent ? "Редактировать студента" : "Добавить студента"}</DialogTitle>
                <DialogDescription>Заполните информацию о студенте.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Имя</Label>
                  <Input id="name" {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="group">Группа</Label>
                  <Input id="group" {...form.register("group")} />
                  {form.formState.errors.group && <p className="text-red-500 text-sm">{form.formState.errors.group.message}</p>}
                </div>
                <div>
                  <Label htmlFor="course">Курс</Label>
                  <Select
                    defaultValue={form.watch("course").toString()}
                    onValueChange={(value) => form.setValue("course", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((c) => (
                        <SelectItem key={c} value={c.toString()}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.course && <p className="text-red-500 text-sm">{form.formState.errors.course.message}</p>}
                </div>
                <div>
                  <Label htmlFor="specialty">Специальность</Label>
                  <Input id="specialty" {...form.register("specialty")} />
                  {form.formState.errors.specialty && <p className="text-red-500 text-sm">{form.formState.errors.specialty.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" type="password" {...form.register("password")} />
                  {form.formState.errors.password && <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Отмена</Button>
                  <Button type="submit">{editingStudent ? "Сохранить" : "Добавить"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-4">
        {students.length > 0 ? (
          students.map((student) => (
            <Card key={student.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-sm">
                        {student.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary">{student.group}</Badge>
                        <Badge variant="outline">{student.course} курс</Badge>
                        <span className="text-sm text-gray-500 truncate">QR: {student.qr_code || "Не установлен"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingStudent(student);
                        setIsAddOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingStudent(student)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить студента {deletingStudent?.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6 text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет студентов</h3>
              <p className="text-gray-600">Добавьте первого студента для начала работы</p>
              <Button className="bg-blue-600 hover:bg-blue-700 mt-4" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Добавить студента
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Events Section Component
function EventsSection({ schoolId, teachers }: { schoolId: string; teachers: User[] }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { name: "", date: "", description: "", teacher_id: teachers.length > 0 ? teachers[0].id : "" },
  });

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      loadEvents(t);
    }
  }, [schoolId]);

  const loadEvents = async (t: string) => {
    try {
      setLoading(true);
      const fetchedEvents = await getEventsBySchool(schoolId, t);
      const attendancePromises = fetchedEvents.map(async (event) => ({
        eventName: event.name,
        attendance: await getAttendanceByEvent(event.name, t),
      }));
      const attendanceData = await Promise.all(attendancePromises);
      const newAttendanceMap = new Map(attendanceData.map(({ eventName, attendance }) => [eventName, attendance]));
      setEvents(fetchedEvents);
      setAttendanceMap(newAttendanceMap);
    } catch (error: any) {
      console.error("Error loading events:", error);
      toast.error("Ошибка при загрузке мероприятий");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editingEvent) {
      form.reset({
        name: editingEvent.name,
        date: editingEvent.date.toISOString().split('T')[0],
        description: editingEvent.description || "",
        teacher_id: editingEvent.teacher_id || teachers.length > 0 ? teachers[0].id : "",
      });
    } else {
      form.reset({
        name: "",
        date: "",
        description: "",
        teacher_id: teachers.length > 0 ? teachers[0].id : "",
      });
    }
  }, [editingEvent, teachers, form]);

  const onSubmit = async (data: EventFormData) => {
    if (!token) {
      toast.error("Токен не найден. Войдите в систему.");
      return;
    }
    try {
      const eventData = {
        ...data,
        date: new Date(data.date),
        is_active: editingEvent ? editingEvent.is_active : false,
        school_id: schoolId,
        teacher_id: data.teacher_id,
      };
      let updatedEvent: Event | null = null;
      if (editingEvent) {
        updatedEvent = await updateEvent(editingEvent.id, eventData, token);
        if (updatedEvent) toast.success(`Мероприятие "${data.name}" успешно обновлено`);
      } else {
        updatedEvent = await addEvent(eventData as Omit<Event, "id">, token);
        if (updatedEvent) toast.success(`Мероприятие "${data.name}" успешно добавлено`);
      }
      if (!updatedEvent) throw new Error("Failed to save event");
      setIsAddOpen(false);
      setEditingEvent(null);
      form.reset({ name: "", date: "", description: "", teacher_id: teachers.length > 0 ? teachers[0].id : "" });
      setTimeout(() => loadEvents(token), 500);
    } catch (error: any) {
      console.error("Error saving event:", error);
      toast.error("Ошибка при сохранении мероприятия: " + (error.message || "Неизвестная ошибка"));
    }
  };

  const handleToggleActive = async (eventId: string, currentActive: boolean) => {
    if (!token) return;
    try {
      const success = await toggleEventActive(eventId, !currentActive, token);
      if (success) {
        toast.success(`Статус мероприятия обновлён`);
        await loadEvents(token);
      } else {
        throw new Error("Failed to toggle event");
      }
    } catch (error: any) {
      console.error("Error toggling event:", error);
      toast.error("Ошибка при обновлении статуса: " + (error.message || "Неизвестная ошибка"));
    }
  };

  const handleDelete = async () => {
    if (!token || !deletingEvent) return;
    try {
      const success = await deleteEvent(deletingEvent.id, token);
      if (success) {
        toast.success(`Мероприятие "${deletingEvent.name}" успешно удалено`);
        setDeletingEvent(null);
        await loadEvents(token);
      } else {
        throw new Error("Failed to delete event");
      }
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Ошибка при удалении мероприятия: " + (error.message || "Неизвестная ошибка"));
    }
  };

  const handleDeleteAttendance = async (recordId: string, eventName: string) => {
    if (!token) return;
    try {
      const success = await deleteAttendanceRecord(recordId, token);
      if (success) {
        setAttendanceMap((prev) => {
          const newMap = new Map(prev);
          const updatedAttendance = newMap.get(eventName)?.filter((record) => record.id !== recordId) || [];
          newMap.set(eventName, updatedAttendance);
          return newMap;
        });
        toast.success("Запись о посещении удалена");
      } else {
        throw new Error("Failed to delete attendance record");
      }
    } catch (error: any) {
      console.error("Error deleting attendance:", error);
      toast.error(`Произошла ошибка при удалении записи: ${error.message || "Неизвестная ошибка"}`);
    }
  };

  const openDetailsDialog = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  if (loading) return <div>Загрузка мероприятий...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Управление мероприятиями</h2>
            <p className="text-gray-600">Добавляйте и управляйте мероприятиями школы</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> Добавить мероприятие
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEvent ? "Редактировать мероприятие" : "Добавить мероприятие"}</DialogTitle>
                <DialogDescription>Заполните информацию о мероприятии.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Название</Label>
                  <Input id="name" {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="date">Дата</Label>
                  <Input id="date" type="date" {...form.register("date")} />
                  {form.formState.errors.date && <p className="text-red-500 text-sm">{form.formState.errors.date.message}</p>}
                </div>
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Input id="description" {...form.register("description")} placeholder="Опционально" />
                </div>
                <div>
                  <Label htmlFor="teacher_id">Преподаватель</Label>
                  <Select
                    value={form.watch("teacher_id") || ""}
                    onValueChange={(value) => form.setValue("teacher_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите преподавателя" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.teacher_id && <p className="text-red-500 text-sm">{form.formState.errors.teacher_id.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Отмена</Button>
                  <Button type="submit">{editingEvent ? "Сохранить" : "Добавить"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-4">
        {events.length > 0 ? (
          events.map((event) => (
            <Card 
              key={event.id} 
              className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => openDetailsDialog(event)}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{event.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary">{event.date.toLocaleDateString("ru-RU")}</Badge>
                        {event.description && (
                          <span className="text-sm text-gray-500 truncate max-w-[200px]">{event.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={event.is_active}
                      onCheckedChange={(checked) => handleToggleActive(event.id, event.is_active)}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <Badge variant={event.is_active ? "default" : "secondary"}>
                      {event.is_active ? "Активно" : "Неактивно"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingEvent(event);
                        setIsAddOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingEvent(event)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить мероприятие "{deletingEvent?.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6 text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет мероприятий</h3>
              <p className="text-gray-600">Добавьте первое мероприятие для начала работы</p>
              <Button className="bg-blue-600 hover:bg-blue-700 mt-4" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Добавить мероприятие
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.name}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  <strong>Дата:</strong> {selectedEvent.date.toLocaleString("ru-RU")}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Описание:</strong> {selectedEvent.description || "Нет описания"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Статус:</strong> {selectedEvent.is_active ? "Активно" : "Неактивно"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Посещений:</strong> {attendanceMap.get(selectedEvent.name)?.length || 0}
                </p>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Посетившие студенты</h3>
                {attendanceMap.get(selectedEvent.name)?.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">Студент</TableHead>
                          <TableHead className="w-[30%]">Время</TableHead>
                          <TableHead className="w-[20%]">Сканировал</TableHead>
                          <TableHead className="w-[20%]">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceMap.get(selectedEvent.name)?.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="truncate">{record.studentName}</TableCell>
                            <TableCell>{record.timestamp.toLocaleString("ru-RU")}</TableCell>
                            <TableCell>{record.scanned_by}</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="whitespace-nowrap"
                                onClick={() => handleDeleteAttendance(record.id, selectedEvent.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Удалить
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Нет записей о посещении</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchoolAdminDashboard() {
  const params = useParams();
  const schoolId = params.id as string;
  const router = useRouter();
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    setToken(t);
    if (!t) {
      router.push("/login");
      return;
    }
    fetchSchool(t);
    fetchStudents(t);
    fetchTeachers(t);
  }, [schoolId, router]);

  const fetchSchool = async (t: string) => {
    try {
      const data = await getSchoolById(schoolId, t);
      setSchool({ id: data.id, name: data.name });
    } catch (err) {
      console.error("Error fetching school:", err);
      toast.error("Ошибка загрузки школы");
      setSchool({ id: schoolId, name: "Неизвестная школа" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (t: string) => {
    try {
      const data = await getStudentsBySchool(schoolId, t);
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
      toast.error("Ошибка загрузки студентов");
    }
  };

  const fetchTeachers = async (t: string) => {
    try {
      const data = await getUsersBySchoolAndRole(schoolId, "teacher", t);
      setTeachers(data);
    } catch (err) {
      console.error("Error fetching teachers:", err);
      toast.error("Ошибка загрузки преподавателей");
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (!school) return <div>Школа не найдена</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">{school.name}</h1>
            <p className="text-muted-foreground">Управление школой</p>
          </div>
          <div className="flex gap-2">
            <Link href="/schools">
              <Button variant="outline">← Назад к школам</Button>
            </Link>
            <Button variant="outline" onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}>
              <LogOut className="h-4 w-4 mr-2" /> Выйти
            </Button>
          </div>
        </div>
        <div className="space-y-12">
          <UsersSection schoolId={schoolId} role="school_admin" students={students} />
          <UsersSection schoolId={schoolId} role="teacher" students={students} />
          <UsersSection schoolId={schoolId} role="parent" students={students} />
          <StudentsSection schoolId={schoolId} />
          <EventsSection schoolId={schoolId} teachers={teachers} />
        </div>
      </div>
    </div>
  );
}