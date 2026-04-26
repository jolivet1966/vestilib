import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VESTILIB',
  description: 'Pose. Profite. Reviens.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
