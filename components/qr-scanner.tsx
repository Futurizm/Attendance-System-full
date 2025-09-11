"use client";

import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Flashlight, FlashlightOff } from "lucide-react";
import { addAttendanceRecord, getActiveEvent, getStudentByQRCode } from "@/lib/database-supabase";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";

interface QRScannerProps {
  onScanSuccess?: () => void;
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    studentName?: string;
    timestamp: Date;
  } | null>(null);

  const startScanner = async () => {
    if (videoRef.current && !scanner) {
      try {
        setError(null);
        console.log("Starting QR scanner with facingMode:", facingMode); // Debug log
        const qrScanner = new QrScanner(
          videoRef.current,
          async (result) => {
            if (!scanning) return;

            // Stop scanner to prevent multiple scans
            qrScanner.stop();
            setScanning(false);
            setScanner(null);

            console.log("Scanned QR code:", result.data); // Debug log
            try {
              const student = await getStudentByQRCode(result.data);
              if (!student) {
                setScanResult({
                  success: false,
                  message: "Студент не найден",
                  timestamp: new Date(),
                });
                toast.error("Студент не найден");
                return;
              }

              const activeEvent = await getActiveEvent();
              if (!activeEvent) {
                setScanResult({
                  success: false,
                  message: "Нет активного мероприятия",
                  timestamp: new Date(),
                });
                toast.error("Нет активного мероприятия");
                return;
              }

              console.log("Adding attendance for student:", student.id, "Event:", activeEvent.name); // Debug log
              const attendanceRecord = await addAttendanceRecord({
                studentId: student.id,
                studentName: student.name,
                eventName: activeEvent.name,
                timestamp: new Date(),
                scannedBy: "scanner",
              });

              if (attendanceRecord) {
                setScanResult({
                  success: true,
                  studentName: student.name,
                  message: `Посещение отмечено для ${student.name}`,
                  timestamp: new Date(),
                });
                toast.success(`Посещение отмечено для ${student.name}`);
                onScanSuccess?.();
              } else {
                setScanResult({
                  success: false,
                  message: "Ошибка при отметке посещения (возможно, посещение уже отмечено)",
                  timestamp: new Date(),
                });
                toast.error("Ошибка при отметке посещения");
              }
            } catch (error: any) {
              console.error("QR scan error:", error);
              const message = error.message.includes("unique_student_event")
                ? "Посещение для этого студента уже отмечено"
                : "Ошибка при обработке QR-кода";
              setScanResult({
                success: false,
                message,
                timestamp: new Date(),
              });
              toast.error(message);
            }
          },
          {
            returnDetailedScanResult: true,
            preferredCamera: facingMode,
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        await qrScanner.start();
        setScanner(qrScanner);
        console.log("Scanner started successfully"); // Debug log
        const flashAvailable = await qrScanner.hasFlash();
        setHasFlash(flashAvailable);
      } catch (err) {
        setError("Не удалось получить доступ к камере. Проверьте разрешения.");
        console.error("Camera access error:", err);
      }
    }
  };

  useEffect(() => {
    if (scanning) {
      startScanner();
    }

    return () => {
      scanner?.destroy();
      setScanner(null);
      console.log("Scanner destroyed"); // Debug log
    };
  }, [scanning, facingMode]);

  const toggleCamera = async () => {
    if (scanner) {
      const newMode = facingMode === "environment" ? "user" : "environment";
      setFacingMode(newMode);
      scanner.destroy();
      setScanner(null);
      await startScanner();
    }
  };

  const toggleFlash = async () => {
    if (scanner) {
      if (flashOn) {
        await scanner.turnFlashOff();
        setFlashOn(false);
      } else {
        await scanner.turnFlashOn();
        setFlashOn(true);
      }
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setScanning(true);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <video ref={videoRef} className="w-full rounded-lg" autoPlay playsInline muted />
        {scanning && (
          <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
            <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary"></div>
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          <Button variant="secondary" size="icon" onClick={toggleCamera}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          {hasFlash && (
            <Button variant="secondary" size="icon" onClick={toggleFlash}>
              {flashOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {scanResult && (
        <Alert variant={scanResult.success ? "default" : "destructive"}>
          {scanResult.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4" />}
          <AlertDescription>
            <div className="space-y-2">
              {scanResult.success && scanResult.studentName && (
                <div className="font-semibold text-green-700">Ученик: {scanResult.studentName}</div>
              )}
              <div>{scanResult.message}</div>
              <div className="text-sm text-muted-foreground">{scanResult.timestamp.toLocaleString("ru-RU")}</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {(error || scanResult) && (
        <Button onClick={resetScanner} variant="outline" className="w-full bg-transparent">
          <RotateCcw className="h-4 w-4 mr-2" />
          Сканировать еще
        </Button>
      )}
    </div>
  );
}