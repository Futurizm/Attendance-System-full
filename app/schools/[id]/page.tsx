"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, LogOut, Users, User, Calendar, QrCode, UserCog } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { getUsersBySchoolAndRole, addUser, deleteUser,
  getStudentsBySchool, addStudent, updateStudent, deleteStudent,
  getEventsBySchool, addEvent, updateEvent, deleteEvent, toggleEventActive,addChildToParent,
  getSchoolById, getAttendanceByEvent, deleteAttendanceRecord // Добавили новые импорты
} from "@/lib/database"; // Импорт API
import type { Student, School, Event, AttendanceRecord } from "@/lib/types"; // Добавьте AttendanceRecord в types если нужно
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; // Добавьте Switch в ui/switch если нет
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Добавили таблицу

// Схема валидации для студента
const studentSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  group: z.string().min(1, "Группа обязательна"),
  course: z.number().int().min(1).max(4, "Курс от 1 до 4"),
  specialty: z.string().min(1, "Специальность обязательна"),
  email: z.string().email("Неверный email").min(1, "Email обязателен"),
  password: z.string().min(8, "Пароль минимум 8 символов"),
  qr_code: z.string().min(1, "QR-код обязателен"),
});

type StudentFormData = z.infer<typeof studentSchema>;

// Схема валидации для события
const eventSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  date: z.string().min(1, "Дата обязательна"),
  description: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

// Типы (добавь в types.ts если нужно)
interface UserForSchool { id: string; email: string; role: string; createdAt: Date; }
interface SchoolDetail { id: string; name: string; }

// Компонент для списка пользователей (админы/родители/преподаватели)
function UsersTab({ schoolId, role }: { schoolId: string; role: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<User | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    if (t) {
      fetchUsers(t);
      if (role === "parent") fetchStudents(t); // Загружаем студентов только для роли parent
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

  const fetchStudents = async (t: string) => {
    try {
      const data = await getStudentsBySchool(schoolId, t);
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
      toast.error("Ошибка загрузки студентов");
    }
  };

  const handleCreateOrUpdateUser = async () => {
    if (!token) return;
    try {
      if (!editingUser) {
        await addUser({ email: newEmail, password: newPassword, role, school_id: schoolId }, token);
      } else {
        toast.warning("Обновление пользователей пока не реализовано");
        return;
      }
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
      await fetchUsers(token); // Обновляем список пользователей, чтобы отобразить новых детей
    } catch (err) {
      console.error("Error adding child:", err);
      toast.error("Ошибка при добавлении ребёнка");
    }
  };

  const roleIcon = role === 'school_admin' ? UserCog : role === 'teacher' ? QrCode : Users;

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Список {role === 'teacher' ? 'преподавателей' : role === 'parent' ? 'родителей' : 'админов школы'}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить {role}</DialogTitle>
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
              <Button onClick={handleCreateOrUpdateUser}>Создать</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4">
        {users.map((user) => (
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
                  onClick={() => {
                    toast.info("Редактирование в разработке");
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" /> Редактировать
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Диалог для добавления ребёнка */}
      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ребёнка к {selectedParent?.email}</DialogTitle>
            <DialogDescription>Выберите студента для привязки к родителю.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Студент</Label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
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

// Компонент для студентов
function StudentsTab({ schoolId }: { schoolId: string }) {
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
    defaultValues: {
      name: "",
      group: "",
      course: 1,
      specialty: "",
      qr_code: "",
    },
  });

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    if (t) loadStudents(t);
  }, [schoolId]);

  const loadStudents = async (t: string) => {
    try {
      setLoading(true);
      console.log("Fetching students for school:", schoolId, "with token:", t ? t.slice(0, 10) + "..." : "no token"); // Лог для отладки
      const data = await getStudentsBySchool(schoolId, t);
      console.log("Loaded students:", data); // Лог для отладки
      // Дополнительный лог для проверки school_id
      console.log("Students with school_id:", data.map(s => ({ name: s.name, school_id: s.school_id, matches: s.school_id === schoolId })));
      setStudents(data);
    } catch (error: any) {
      console.error("Error loading students:", error); // Улучшенный лог
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
      email: "", // Add if editing includes email/password, but may need to fetch them separately
      password: "", // Password can't be fetched (hashed), so for edit, perhaps skip or generate new
    });
  } else {
    form.reset({
      name: "",
      group: "",
      course: 1,
      specialty: "",
      email: "",
      password: "",
    });
  }
}, [editingStudent, form]);

  useEffect(() => {
    const newQrCode = crypto.randomUUID();
    if (editingStudent) {
      form.reset({
        name: editingStudent.name,
        group: editingStudent.group,
        course: editingStudent.course,
        specialty: editingStudent.specialty,
        qr_code: editingStudent.qr_code,
      });
    } else {
      form.reset({
        name: "",
        group: "",
        course: 1,
        specialty: "",
        qr_code: newQrCode,
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
      const studentData = {
        ...data,
        school_id: schoolId, // Добавляем school_id при отправке
      };
      console.log("Submitting student data:", studentData);
      let updatedStudent: Student | null = null;
      if (editingStudent) {
        updatedStudent = await updateStudent(editingStudent.id, studentData, token);
        if (updatedStudent) {
          toast.success(`Студент ${data.name} успешно обновлен`);
        } else {
          throw new Error("Failed to update student");
        }
      } else {
        updatedStudent = await addStudent(studentData, token);
        if (updatedStudent) {
          toast.success(`Студент ${data.name} успешно добавлен`);
          // Лог после добавления, чтобы проверить school_id в ответе
          console.log("Added student response:", updatedStudent);
        } else {
          throw new Error("Failed to add student");
        }
      }
      setIsAddOpen(false);
      setEditingStudent(null);
      form.reset({
        name: "",
        group: "",
        course: 1,
        specialty: "",
        qr_code: crypto.randomUUID(),
      });
      setQrCodeURL("");
      // Добавляем небольшую задержку, если нужно, но обычно не требуется
      setTimeout(() => loadStudents(token), 500); // Опционально: задержка для обновления БД
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
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Управление студентами</h2>
            <p className="text-gray-600">Добавляйте, редактируйте и управляйте студентами</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить студента
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStudent ? "Редактировать студента" : "Добавить студента"}</DialogTitle>
                  <DialogDescription>
                    Заполните информацию о студенте.
                  </DialogDescription>
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
                    <Label htmlFor="email">Email (для аккаунта студента)</Label>
                    <Input id="email" type="email" {...form.register("email")} />
                    {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="password">Пароль (для аккаунта студента)</Label>
                    <Input id="password" type="password" {...form.register("password")} />
                    {form.formState.errors.password && <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>}
                  </div>
                  {/* Remove qr_code field and generation, as backend handles it */}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">{editingStudent ? "Сохранить" : "Добавить"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="grid gap-4">
        {students.length > 0 ? (
          students.map((student) => (
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
                        <span className="text-sm text-gray-500 truncate">QR: {student.qr_code || "Не установлен"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
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
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
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
          <p>Нет студентов для отображения</p>
        )}
      </div>

      {/* Empty State */}
      {students.length === 0 && !loading && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <div className="text-gray-500 mb-4">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет студентов</h3>
              <p className="text-gray-600">Добавьте первого студента для начала работы</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить студента
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Компонент для мероприятий
function EventsTab({ schoolId }: { schoolId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]); // New state for teachers
  const [token, setToken] = useState<string | null>(null);

  const form = useForm<EventFormData & { teacher_id?: string }>({ // Extend form to include teacher_id
    resolver: zodResolver(eventSchema.extend({ teacher_id: z.string().min(1, "Преподаватель обязателен") })),
    defaultValues: {
      name: "",
      date: "",
      description: "",
      teacher_id: "",
    },
  });

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    if (t) {
      loadEvents(t);
      loadTeachers(t); // Fetch teachers
    }
  }, [schoolId]);

  const loadTeachers = async (t: string) => {
    try {
      const fetchedTeachers = await getUsersBySchoolAndRole(schoolId, "teacher", t);
      setTeachers(fetchedTeachers);
    } catch (error: any) {
      console.error("Error loading teachers:", error);
      toast.error("Ошибка при загрузке преподавателей");
    }
  };

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
        teacher_id: editingEvent.teacher_id || "",
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

  const onSubmit = async (data: EventFormData & { teacher_id?: string }) => {
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
        teacher_id: data.teacher_id, // Include teacher_id
      };
      console.log("Submitting event data:", eventData);
      let updatedEvent: Event | null = null;
      if (editingEvent) {
        updatedEvent = await updateEvent(editingEvent.id, eventData, token);
        if (updatedEvent) {
          toast.success(`Мероприятие "${data.name}" успешно обновлено`);
        } else {
          throw new Error("Failed to update event");
        }
      } else {
        updatedEvent = await addEvent(eventData as Omit<Event, "id">, token);
        if (updatedEvent) {
          toast.success(`Мероприятие "${data.name}" успешно добавлено`);
          console.log("Added event response:", updatedEvent);
        } else {
          throw new Error("Failed to add event");
        }
      }
      setIsAddOpen(false);
      setEditingEvent(null);
      form.reset({
        name: "",
        date: "",
        description: "",
        teacher_id: teachers.length > 0 ? teachers[0].id : "",
      });
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
    console.log("Opening details for event:", event);
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  if (loading) return <div>Загрузка мероприятий...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Управление мероприятиями</h2>
            <p className="text-gray-600">Добавляйте и управляйте мероприятиями школы</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить мероприятие
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEvent ? "Редактировать мероприятие" : "Добавить мероприятие"}</DialogTitle>
                  <DialogDescription>
                    Заполните информацию о мероприятии.
                  </DialogDescription>
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
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">{editingEvent ? "Сохранить" : "Добавить"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Events List */}
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
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                          {event.date.toLocaleDateString("ru-RU")}
                        </Badge>
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
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
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
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
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
          <p>Нет мероприятий для отображения</p>
        )}
      </div>

      {/* Empty State */}
      {events.length === 0 && !loading && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <div className="text-gray-500 mb-4">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет мероприятий</h3>
              <p className="text-gray-600">Добавьте первое мероприятие для начала работы</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить мероприятие
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Event Details Dialog */}
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

export default function SchoolDetails() {
  const params = useParams();
  const schoolId = params.id as string;
  const router = useRouter();
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>(""); // Инициализируем пустой строкой

  useEffect(() => {
    // Получаем токен только на клиенте
    const t = localStorage.getItem("token") || "";
    setToken(t);
    if (!t) {
      router.push("/login");
      return;
    }
    // Fetch school details
    fetchSchool(t);
  }, [schoolId, router]);

  const fetchSchool = async (t: string) => {
    try {
      console.log("Fetching school:", schoolId); // Лог для отладки
      const data = await getSchoolById(schoolId, t);
      console.log("Loaded school:", data); // Лог для отладки
      setSchool({ id: data.id, name: data.name });
    } catch (err) {
      console.error("Error fetching school:", err); // Лог для отладки
      toast.error("Ошибка загрузки школы");
      setSchool({ id: schoolId, name: "Неизвестная школа" }); // Fallback
    } finally {
      setLoading(false);
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
            <p className="text-muted-foreground">Управление сущностями школы</p>
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

        <Tabs defaultValue="admins" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="admins">Админы школы</TabsTrigger>
            <TabsTrigger value="teachers">Преподаватели</TabsTrigger>
            <TabsTrigger value="parents">Родители</TabsTrigger>
            <TabsTrigger value="students">Студенты</TabsTrigger>
            <TabsTrigger value="events">Мероприятия</TabsTrigger>
          </TabsList>
          <TabsContent value="admins">
            <UsersTab schoolId={schoolId} role="school_admin" />
          </TabsContent>
          <TabsContent value="teachers">
            <UsersTab schoolId={schoolId} role="teacher" />
          </TabsContent>
          <TabsContent value="parents">
            <UsersTab schoolId={schoolId} role="parent" />
          </TabsContent>
          <TabsContent value="students">
            <StudentsTab schoolId={schoolId} />
          </TabsContent>
          <TabsContent value="events">
            <EventsTab schoolId={schoolId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}