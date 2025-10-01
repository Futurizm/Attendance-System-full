"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getMyChildren, getSchoolById } from "@/lib/database";
import type { School, Student } from "@/lib/types";

interface ParentProfile {
  email: string;
  school_id: string;
  userId: string;
}

export default function ParentProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [children, setChildren] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    console.log("Token:", t);
    if (!t) {
      toast.error("Токен не найден. Войдите в систему.");
      router.push("/login");
      return;
    }
    setToken(t);
    try {
      const decoded: any = jwtDecode(t);
      console.log("Decoded token:", decoded);
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp < currentTime) {
        toast.error("Срок действия токена истёк. Войдите снова.");
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      if (decoded.role !== "parent") {
        toast.error("Доступ запрещён для этой роли");
        router.push("/");
        return;
      }
      setParent({
        email: decoded.email,
        school_id: decoded.school_id,
        userId: decoded.userId,
      });
      fetchData(decoded.school_id, decoded.userId, t);
    } catch (err) {
      console.error("Error decoding token:", err);
      toast.error("Ошибка декодирования токена");
      router.push("/login");
    }
  }, [router]);

  const fetchData = async (schoolId: string, userId: string, t: string) => {
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Запрос превысил время ожидания");
      toast.error("Запрос превысил время ожидания");
    }, 10000);
    try {
      console.log("Starting fetchData...");
      const schoolData = await getSchoolById(schoolId, t);
      console.log("School data received:", schoolData);
      setSchool(schoolData);

      const childrenData = await getMyChildren(t);
      console.log("Children data received:", childrenData);
      setChildren(childrenData || []); // Ensure children is an array
    } catch (err: any) {
      console.error("Error fetching parent profile data:", {
        message: err.message,
        schoolId,
        userId,
        token: t.slice(0, 10) + "...",
      });
      setError(err.message);
      toast.error(`Ошибка загрузки профиля: ${err.message}`);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      console.log("Fetch completed, loading set to false");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleRetry = () => {
    if (parent && token) {
      fetchData(parent.school_id, parent.userId, token);
    }
  };

  // Render nothing until useEffect determines the state
  if (!token || !parent) {
    return null; // Router.push will handle redirection in useEffect
  }

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={handleRetry} className="mt-4">
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Профиль родителя</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Выйти
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Информация о родителе
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Email:</strong> {parent.email}</p>
            <p><strong>Школа:</strong> {school ? school.name : "Не удалось загрузить данные школы"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Дети
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Группа</TableHead>
                  <TableHead>Курс</TableHead>
                  <TableHead>Специальность</TableHead>
                  <TableHead>Школа</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.map((child) => (
                  <TableRow key={child.id || child._id}>
                    <TableCell>{child.name}</TableCell>
                    <TableCell>{child.group || "N/A"}</TableCell>
                    <TableCell>{child.course || "N/A"}</TableCell>
                    <TableCell>{child.specialty || "N/A"}</TableCell>
                    <TableCell>{school ? school.name : "Неизвестно"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground">Нет зарегистрированных детей</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}