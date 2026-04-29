'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  return (
    <div className="min-h-screen bg-[#F5C84A] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-[#1A3A6B] rounded-full flex items-center justify-center text-4xl mb-6">?</div>
      <h1 className="text-2xl font-semibold text-[#1A3A6B] mb-2">Paiement confirmé !</h1>
      <p className="text-sm text-amber-900 mb-8">Votre réservation est enregistrée.</p>
      <Link href="/" className="bg-[#1A3A6B] text-[#F5C84A] rounded-full px-8 py-3 text-sm font-medium">
        Retour à l accueil
      </Link>
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Chargement...</p></div>}>
      <SuccessContent />
    </Suspense>
  )
}
