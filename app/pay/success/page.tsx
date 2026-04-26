'use client'
// app/pay/success/page.tsx
import { useEffect, useState } from 'react'
import { useSearchParams }     from 'next/navigation'
import Link                    from 'next/link'

export default function PaySuccessPage() {
  const params    = useSearchParams()
  const sessionId = params.get('session_id')
  const [booking, setBooking] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/booking-by-session?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => setBooking(d.booking))
      .catch(() => {})
  }, [sessionId])

  return (
    <div className="min-h-screen bg-[#F5C84A] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-[#1A3A6B] rounded-full flex items-center justify-center text-4xl mb-6">
        ✓
      </div>
      <h1 className="text-2xl font-semibold text-[#1A3A6B] mb-2">Paiement confirmé !</h1>
      <p className="text-sm text-amber-900 mb-8">Votre réservation est enregistrée.</p>

      {booking && (
        <div className="bg-[#1A3A6B] rounded-2xl p-5 w-full max-w-xs mb-6 text-left">
          <p className="text-[10px] text-white/50 uppercase tracking-wider mb-3">Réservation</p>
          <p className="font-mono text-xl font-bold text-[#F5C84A] mb-4">{booking.bookingCode}</p>
          <Row label="Total payé"   value={`${booking.totalAmount}€`} />
          <Row label="Statut"       value="Confirmé ✓" />
        </div>
      )}

      <Link href="/" className="bg-[#1A3A6B] text-[#F5C84A] rounded-full px-8 py-3 text-sm font-medium">
        Retour à l'accueil
      </Link>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-1.5 border-b border-white/10 last:border-none">
      <span className="text-white/60">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}
