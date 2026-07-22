import type { Metadata } from 'next'
import './globals.css'
import PushInit from '@/app/components/PushInit'
import InstallBanner from '@/app/components/InstallBanner'

export const metadata: Metadata = {
  title: 'VESTILIB',
  description: 'Pose. Profite. Reviens.',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#272757" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-[#272757] min-h-screen font-sans antialiased">
        <InstallBanner />
        {children}
        <PushInit />
      </body>
    </html>
  )
}