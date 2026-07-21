'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PendingContent() {
  const params = useSearchParams()
  const bookingCode = params.get('code') ?? ''
  const email = params.get('email') ?? ''

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-4xl mb-6">
        ⏳
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Demande envoyee !</h1>
      <p className="text-sm text-gray-500 mb-4">
        Votre demande de reservation a bien ete transmise a l hote.
      </p>
      {bookingCode && (
        <div className="bg-[#1E3A8A] rounded-2xl px-6 py-4 mb-4">
          <p className="text-white/60 text-xs mb-1">Code de demande</p>
          <p className="text-[#F5C84A] font-mono font-bold text-xl">{bookingCode}</p>
        </div>
      )}
      {email && (
        <p className="text-sm text-gray-400 mb-6">
          Vous recevrez une reponse par email a <strong>{email}</strong>
        </p>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 max-w-sm w-full mb-6 text-left space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Prochaines etapes</p>
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-[#F5C84A] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
          <p className="text-sm text-gray-600">L hote examine votre demande</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-[#F5C84A] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
          <p className="text-sm text-gray-600">Vous recevez un email d acceptation ou de refus</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-[#F5C84A] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
          <p className="text-sm text-gray-600">Si accepte, un lien de paiement vous est envoye</p>
        </div>
      </div>
      <Link href="/map" className="bg-[#1E3A8A] text-[#F5C84A] font-semibold px-8 py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
        Retour a la carte
      </Link>
    </div>
  )
}

export default function PendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PendingContent />
    </Suspense>
  )
}