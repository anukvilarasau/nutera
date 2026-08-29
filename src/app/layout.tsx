import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ServiceWorkerRegistration } from '@/components/service-worker'

export const metadata: Metadata = {
  title: 'Nutera',
  description: 'Sistema de gestión de inventario para frutos secos',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Nutera' },
}

export const viewport: Viewport = {
  themeColor: '#18181b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
