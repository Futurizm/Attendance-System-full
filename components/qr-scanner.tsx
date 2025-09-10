"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, CameraOff, CheckCircle, XCircle, RotateCcw } from "lucide-react"
import { parseQRCodeData } from "@/lib/qr-utils"
import { getStudentByQRCode, addAttendanceRecord, getActiveEvent } from "@/lib/database"

interface ScanResult {
  success: boolean
  studentName?: string
  message: string
  timestamp: Date
}

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startScanning = async () => {
    try {
      setError(null)
      setScanResult(null)

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera if available
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)

        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(() => {
          scanQRCode()
        }, 500) // Scan every 500ms
      }
    } catch (err) {
      setError("Не удалось получить доступ к камере. Проверьте разрешения.")
      console.error("Camera access error:", err)
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    setIsScanning(false)
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for QR code detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Simple QR code detection simulation
    // In a real implementation, you would use a library like jsQR
    // For now, we'll simulate QR code detection with a manual input
    detectQRCodeFromImageData(imageData)
  }

  const detectQRCodeFromImageData = (imageData: ImageData) => {
    // This is a placeholder for actual QR code detection
    // In a real implementation, you would use a library like jsQR
    // For demonstration, we'll use a simulated detection

    // Simulate QR code detection with a random chance
    if (Math.random() < 0.1) {
      // 10% chance to simulate detection
      // Simulate detecting a student QR code
      const students = ["STU001", "STU002", "STU003", "STU004", "STU005"]
      const randomQR = students[Math.floor(Math.random() * students.length)]
      processQRCode(randomQR)
    }
  }

  const processQRCode = (qrData: string) => {
    try {
      // Try to parse as JSON first (our format)
      const parsedData = parseQRCodeData(qrData)

      if (parsedData) {
        handleStudentScan(parsedData.studentId, parsedData.studentName)
      } else {
        // Try to find student by QR code directly
        const student = getStudentByQRCode(qrData)
        if (student) {
          handleStudentScan(student.id, student.name)
        } else {
          setScanResult({
            success: false,
            message: "QR-код не распознан или ученик не найден",
            timestamp: new Date(),
          })
        }
      }
    } catch (err) {
      setScanResult({
        success: false,
        message: "Ошибка при обработке QR-кода",
        timestamp: new Date(),
      })
    }

    // Stop scanning after successful detection
    stopScanning()
  }

  const handleStudentScan = (studentId: string, studentName: string) => {
    const activeEvent = getActiveEvent()

    if (!activeEvent) {
      setScanResult({
        success: false,
        message: "Нет активного мероприятия для отметки посещения",
        timestamp: new Date(),
      })
      return
    }

    // Add attendance record
    const attendanceRecord = addAttendanceRecord({
      studentId,
      studentName,
      eventName: activeEvent.name,
      timestamp: new Date(),
      scannedBy: "Преподаватель", // In a real app, this would be the logged-in user
    })

    setScanResult({
      success: true,
      studentName,
      message: `Посещение отмечено для мероприятия "${activeEvent.name}"`,
      timestamp: attendanceRecord.timestamp,
    })
  }

  const resetScanner = () => {
    setScanResult(null)
    setError(null)
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Scanner Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR-сканер посещаемости
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isScanning ? (
            <Button onClick={startScanning} className="w-full" size="lg">
              <Camera className="h-4 w-4 mr-2" />
              Начать сканирование
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="destructive" className="w-full" size="lg">
              <CameraOff className="h-4 w-4 mr-2" />
              Остановить сканирование
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Camera View */}
      {isScanning && (
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-black rounded-lg object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning overlay */}
              <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary"></div>
              </div>

              <div className="absolute bottom-2 left-2 right-2 text-center">
                <Badge variant="secondary" className="bg-black/50 text-white">
                  Наведите камеру на QR-код
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual QR Input for Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Тестирование (для демонстрации)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => processQRCode("STU001")} className="text-xs">
              Тест: Иван Петров
            </Button>
            <Button variant="outline" size="sm" onClick={() => processQRCode("STU002")} className="text-xs">
              Тест: Мария Сидорова
            </Button>
            <Button variant="outline" size="sm" onClick={() => processQRCode("STU003")} className="text-xs">
              Тест: Алексей Иванов
            </Button>
            <Button variant="outline" size="sm" onClick={() => processQRCode("INVALID")} className="text-xs">
              Тест: Неверный QR
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Scan Result */}
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

      {/* Reset Button */}
      {(scanResult || error) && (
        <Button onClick={resetScanner} variant="outline" className="w-full bg-transparent">
          <RotateCcw className="h-4 w-4 mr-2" />
          Сканировать еще
        </Button>
      )}
    </div>
  )
}
