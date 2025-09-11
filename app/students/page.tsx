"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Users } from "lucide-react";
import { getAllStudents, addStudent, updateStudent, deleteStudent } from "@/lib/database-supabase";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { BulkQRGenerator } from "@/components/bulk-qr-generator";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Student } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const studentSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  group: z.string().min(1, "Группа обязательна"),
  course: z.number().int().min(1).max(4, "Курс от 1 до 4"),
  specialty: z.string().min(1, "Специальность обязательна"),
  qrCode: z.string().min(1, "QR-код обязателен"),
});

type StudentFormData = z.infer<typeof studentSchema>;

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [qrCodeURL, setQrCodeURL] = useState<string>("");
  const [qrError, setQrError] = useState<string | null>(null);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      group: "",
      course: 1,
      specialty: "",
      qrCode: "",
    },
  });

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getAllStudents();
      console.log("Loaded students:", data); // Debug log
      setStudents(data);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (editingStudent) {
      form.reset({
        name: editingStudent.name,
        group: editingStudent.group,
        course: editingStudent.course,
        specialty: editingStudent.specialty,
        qrCode: editingStudent.qrCode,
      });
      console.log("Editing student QR:", editingStudent.qrCode); // Debug log
    } else {
      const newQrCode = crypto.randomUUID();
      form.reset({
        name: "",
        group: "",
        course: 1,
        specialty: "",
        qrCode: newQrCode,
      });
      console.log("New QR Code generated:", newQrCode); // Debug log
    }
  }, [editingStudent, form]);

  // Generate QR code when modal opens or qrCode changes
  useEffect(() => {
    if (isAddOpen && form.watch("qrCode")) {
      setQrError(null);
      console.log("Generating QR for:", form.watch("qrCode")); // Debug log
      QRCode.toDataURL(form.watch("qrCode"), { width: 256, margin: 2, errorCorrectionLevel: "H" }, (err, url) => {
        if (err) {
          console.error("QR Code URL Error in Modal:", err);
          setQrError("Ошибка генерации QR-кода");
          setQrCodeURL("");
        } else {
          setQrCodeURL(url);
        }
      });
    } else {
      setQrCodeURL("");
    }
  }, [isAddOpen, form.watch("qrCode")]);

  const onSubmit = async (data: StudentFormData) => {
    try {
      console.log("Submitting student data:", data); // Debug log
      if (editingStudent) {
        await updateStudent(editingStudent.id, data);
      } else {
        await addStudent(data);
      }
      setIsAddOpen(false);
      setEditingStudent(null);
      form.reset({
        name: "",
        group: "",
        course: 1,
        specialty: "",
        qrCode: crypto.randomUUID(),
      });
      setQrCodeURL("");
      await loadStudents();
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  const handleDelete = async () => {
    if (deletingStudent) {
      await deleteStudent(deletingStudent.id);
      setDeletingStudent(null);
      await loadStudents();
    }
  };

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
    );
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
                    <Select defaultValue={form.watch("course").toString()} onValueChange={(value) => form.setValue("course", parseInt(value))}>
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
                    <Label>QR-код</Label>
                    <div className="mt-2 flex justify-center">
                      {form.watch("qrCode") && qrCodeURL && !qrError ? (
                        <div className="p-4 bg-white rounded-lg border-2 border-primary/20">
                          <img src={qrCodeURL} alt="QR-код" className="w-64 h-64" />
                        </div>
                      ) : qrError ? (
                        <p className="w-64 h-64 flex items-center justify-center text-red-500 text-center">{qrError}</p>
                      ) : (
                        <p className="text-gray-500 text-sm">QR-код будет сгенерирован после заполнения формы</p>
                      )}
                    </div>
                    <Input id="qrCode" {...form.register("qrCode")} type="hidden" />
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingStudent ? "Сохранить" : "Добавить"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
        {students.map((student) => {
          console.log("Rendering student:", student.name, "QR:", student.qrCode); // Debug log
          return (
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
                        <span className="text-sm text-gray-500 truncate">QR: {student.qrCode || "Не установлен"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <QRCodeDisplay student={student} />
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
          );
        })}
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