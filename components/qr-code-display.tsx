"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Download, Printer as Print, QrCode } from "lucide-react";
import type { Student } from "@/lib/types";

interface QRCodeDisplayProps {
  student: Student;
  trigger?: React.ReactNode;
}

export function QRCodeDisplay({ student, trigger }: QRCodeDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCodeURL, setQRCodeURL] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const generateQRCode = () => {
    if (!student.qrCode) {
      setError("QR-код не задан для этого студента");
      setQRCodeURL("");
      return;
    }

    setError(null);

    // Generate QR code for canvas
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, student.qrCode, { width: 256, margin: 2, errorCorrectionLevel: "H" }, (err) => {
        if (err) {
          console.error("QR Code Canvas Error:", err);
          setError("Ошибка генерации QR-кода");
        }
      });
    }

    // Generate QR code for print/download
    QRCode.toDataURL(student.qrCode, { width: 256, margin: 2, errorCorrectionLevel: "H" }, (err, url) => {
      if (err) {
        console.error("QR Code URL Error:", err);
        setError("Ошибка генерации URL QR-кода");
      } else {
        setQRCodeURL(url);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen, student.qrCode]);

  const handlePrint = () => {
    if (!qrCodeURL) {
      console.error("No QR code URL available for printing");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR-код - ${student.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
                margin: 0;
              }
              .qr-container {
                max-width: 400px;
                margin: 0 auto;
                border: 2px solid #1E3A8A;
                border-radius: 10px;
                padding: 20px;
              }
              .student-info {
                margin-bottom: 20px;
              }
              .qr-code {
                margin: 20px 0;
              }
              .instructions {
                font-size: 12px;
                color: #666;
                margin-top: 20px;
              }
            </style>
          </head>
          <body onload="window.print();window.close()">
            <div class="qr-container">
              <div class="student-info">
                <h2>${student.name}</h2>
                <p>Группа: ${student.group}</p>
                <p>Курс: ${student.course}</p>
                <p>Специальность: ${student.specialty}</p>
                <p>ID: ${student.qrCode || "Не задан"}</p>
              </div>
              <div class="qr-code">
                <img src="${qrCodeURL}" alt="QR-код для ${student.name}" />
              </div>
              <div class="instructions">
                <p>Отсканируйте этот QR-код для отметки посещения</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = () => {
    if (!qrCodeURL) {
      console.error("No QR code URL available for download");
      return;
    }
    const link = document.createElement("a");
    link.href = qrCodeURL;
    link.download = `qr-${student.name.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <QrCode className="h-4 w-4 mr-2" />
            QR-код
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>QR-код ученика</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">{student.name}</h3>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge variant="secondary">{student.group}</Badge>
                  <Badge variant="outline">Курс: {student.course}</Badge>
                  <Badge variant="outline">ID: {student.qrCode || "Не задан"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg border-2 border-primary/20">
              {error ? (
                <p className="w-64 h-64 flex items-center justify-center text-red-500 text-center">{error}</p>
              ) : (
                <canvas ref={canvasRef} className="w-64 h-64" />
              )}
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Отсканируйте этот QR-код для отметки посещения ученика</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1" disabled={!qrCodeURL}>
              <Print className="h-4 w-4 mr-2" />
              Печать
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1 bg-transparent" disabled={!qrCodeURL}>
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}