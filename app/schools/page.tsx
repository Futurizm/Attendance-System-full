"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

interface School {
  _id: string;
  name: string;
  created_at: string;
}

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchSchools(token);
  }, [router]);

  const fetchSchools = async (token: string) => {
    try {
      const response = await fetch("http://localhost:5000/api/schools", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      const data = await response.json();
      setSchools(data);
    } catch (err) {
      console.error("Error fetching schools:", err);
      toast.error("Ошибка при загрузке школ");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateSchool = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const url = editingSchool
        ? `http://localhost:5000/api/schools/${editingSchool._id}`
        : "http://localhost:5000/api/schools";
      const method = editingSchool ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSchoolName }),
      });

      if (response.ok) {
        await fetchSchools(token);
        setIsDialogOpen(false);
        setNewSchoolName("");
        setEditingSchool(null);
        toast.success(editingSchool ? "Школа обновлена" : "Школа создана");
      } else {
        toast.error("Ошибка при сохранении школы");
      }
    } catch (err) {
      console.error("Error saving school:", err);
      toast.error("Ошибка при сохранении школы");
    }
  };

  const handleDeleteSchool = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/schools/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchSchools(token);
        toast.success("Школа удалена");
      } else {
        toast.error("Ошибка при удалении школы");
      }
    } catch (err) {
      console.error("Error deleting school:", err);
      toast.error("Ошибка при удалении школы");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Управление школами</h1>
            <p className="text-muted-foreground">Создавайте и управляйте школами</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить школу
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSchool ? "Редактировать школу" : "Добавить школу"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название школы</Label>
                    <Input
                      id="name"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleCreateOrUpdateSchool}>
                      {editingSchool ? "Сохранить" : "Создать"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {schools.map((school) => (
            <Card key={school._id}>
              <CardHeader>
                <CardTitle>{school.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <p>Создано: {new Date(school.created_at).toLocaleDateString("ru-RU")}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingSchool(school);
                        setNewSchoolName(school.name);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button variant="destructive" onClick={() => handleDeleteSchool(school._id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">← Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}