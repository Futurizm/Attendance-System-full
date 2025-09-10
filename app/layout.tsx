import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "AttendanceIT - Система посещаемости",
  description: "Система контроля посещаемости для колледжа информационных технологий",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-gray-50`}>
        <Suspense fallback={<div>Loading...</div>}>
          <Sidebar />
          <main className="lg:ml-64 min-h-screen">
            <div className="p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
          </main>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
