'use client'
// app/pay/cancel/page.tsx
import Link from 'next/link'

export default function PayCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mb-4">✕</div>
      <h1 className="text-xl font-semibold text-gray-800 mb-2">Paiement annulé</h1>
      <p className="text-sm text-gray-400 mb-6">Votre carte n'a pas été débitée.</p>
      <Link href="/" className="bg-[#1A3A6B] text-[#F5C84A] rounded-full px-8 py-3 text-sm font-medium">
        Réessayer
      </Link>
    </div>
  )
}
