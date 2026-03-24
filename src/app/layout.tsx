import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PhotoBooth SaaS',
  description: 'Event photo booth platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif' }} className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  )
}
