"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Printer as Print, QrCode } from "lucide-react"
import QRCode from "qrcode"
import type { Student } from "@/lib/types"

interface BulkQRGeneratorProps {
  students: Student[]
}

export function BulkQRGenerator({ students }: BulkQRGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [qrCodeURLs, setQRCodeURLs] = useState<Record<string, string>>({})

  // Генерируем QR-коды заранее для всех студентов
  useEffect(() => {
    const generateQRCodeURLs = async () => {
      const urls: Record<string, string> = {}
      for (const student of students) {
        if (student.qrCode) {
          try {
            const url = await QRCode.toDataURL(student.qrCode, { scale: 6, margin: 2 })
            urls[student.id] = url
            console.log(`Generated QR for ${student.name}:`, student.qrCode) // Для дебага
          } catch (error) {
            console.error(`Error generating QR for ${student.name}:`, error)
          }
        }
      }
      setQRCodeURLs(urls)
    }

    generateQRCodeURLs()
  }, [students])

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map((s) => s.id))
    }
  }

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    )
  }

  const handleBulkPrint = () => {
    const selectedStudentData = students.filter((s) => selectedStudents.includes(s.id))

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      const qrCodesHTML = selectedStudentData
        .map((student) => {
          const qrCodeURL = qrCodeURLs[student.id] || ""
          if (!qrCodeURL) return "" // Пропускаем, если QR не сгенерирован

          return `
          <div class="qr-card">
            <div class="student-info">
              <h3>${student.name}</h3>
              <p>Группа: ${student.group}</p>
              <p>Курс: ${student.course}</p>
              <p>Специальность: ${student.specialty}</p>
              <p>ID: ${student.qrCode}</p>
            </div>
            <div class="qr-code">
              <img src="${qrCodeURL}" alt="QR-код для ${student.name}" />
            </div>
          </div>
        `
        })
        .filter(Boolean) // Убираем пустые
        .join("")

      printWindow.document.write(`
        <html>
          <head>
            <title>QR-коды учеников</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0;
                padding: 20px;
              }
              .qr-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
              }
              .qr-card {
                border: 2px solid #1E3A8A;
                border-radius: 10px;
                padding: 15px;
                text-align: center;
                page-break-inside: avoid;
              }
              .student-info h3 {
                margin: 0 0 5px 0;
                color: #1E3A8A;
              }
              .student-info p {
                margin: 0 0 5px 0;
                font-size: 12px;
                color: #666;
              }
              .qr-code img {
                width: 150px;
                height: 150px;
              }
              @media print {
                .qr-card {
                  break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <h1 style="text-align: center; color: #1E3A8A; margin-bottom: 30px;">QR-коды учеников</h1>
            <div class="qr-grid">
              ${qrCodesHTML}
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <QrCode className="h-4 w-4 mr-2" />
          Массовая генерация QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Массовая генерация QR-кодов</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center space-x-2 pb-4 border-b">
            <Checkbox
              id="select-all"
              checked={selectedStudents.length === students.length && students.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Выбрать всех ({students.length} учеников)
            </label>
          </div>

          {/* Student List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {students.map((student) => (
              <div key={student.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted">
                <Checkbox
                  id={student.id}
                  checked={selectedStudents.includes(student.id)}
                  onCheckedChange={() => handleStudentToggle(student.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{student.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {student.group}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleBulkPrint} disabled={selectedStudents.length === 0} className="flex-1">
              <Print className="h-4 w-4 mr-2" />
              Печать выбранных ({selectedStudents.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}