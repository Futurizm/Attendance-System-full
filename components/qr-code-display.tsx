"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Download, Printer as Print, QrCode } from "lucide-react"
import { generateQRCodeData, generateQRCodeURL } from "@/lib/qr-utils"
import type { Student } from "@/lib/types"

interface QRCodeDisplayProps {
  student: Student
  trigger?: React.ReactNode
}

export function QRCodeDisplay({ student, trigger }: QRCodeDisplayProps) {
  const [isOpen, setIsOpen] = useState(false)

  const qrData = generateQRCodeData(student.id, student.name)
  const qrCodeURL = generateQRCodeURL(qrData, 300)

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
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
          <body>
            <div class="qr-container">
              <div class="student-info">
                <h2>${student.name}</h2>
                <p>Класс: ${student.class}</p>
                <p>ID: ${student.qrCode}</p>
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
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = qrCodeURL
    link.download = `qr-${student.name.replace(/\s+/g, "_")}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
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
          {/* Student Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">{student.name}</h3>
                <div className="flex justify-center gap-2">
                  <Badge variant="secondary">{student.class}</Badge>
                  <Badge variant="outline">ID: {student.qrCode}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg border-2 border-primary/20">
              <img src={qrCodeURL || "/placeholder.svg"} alt={`QR-код для ${student.name}`} className="w-64 h-64" />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Отсканируйте этот QR-код для отметки посещения ученика</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1">
              <Print className="h-4 w-4 mr-2" />
              Печать
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1 bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
