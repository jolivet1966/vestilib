import type { Metadata } from 'next'
import './globals.css'
import PushInit from '@/app/components/PushInit'

export const metadata: Metadata = {
  title: 'VESTILIB',
  description: 'Pose. Profite. Reviens.',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A3A6B" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-gray-50 min-h-screen font-sans antialiased">
        {children}
        <PushInit />
      </body>
    </html>
  )
}