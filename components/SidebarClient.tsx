"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SidebarClient() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setHasToken(!!token);

    const handleStorageChange = () => {
      const newToken = localStorage.getItem("token");
      setHasToken(!!newToken);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setHasToken(false);
    router.push("/login");
  };

  if (!hasToken) return null;

  return (
    <div className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200 shadow-sm lg:flex flex-col hidden">
      <Sidebar />
      <div className="p-4 mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Выйти
        </Button>
      </div>
    </div>
  );
}