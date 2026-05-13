'use client'
// app/pay/success/page.tsx
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Booking {
  bookingCode:    string
  totalAmount:    number
  hostEarns:      number
  customerEmail?: string
  status:         string
}

function SuccessContent() {
  const params    = useSearchParams()
  const sessionId = params.get('session_id')

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!sessionId) { setLoading(false); return }

    const poll = async (attempts = 0) => {
      try {
        const res  = await fetch(`/api/booking-by-session?sessionId=${sessionId}`)
        const data = await res.json()

        if (data.booking?.status === 'paid') {
          setBooking(data.booking)
          setLoading(false)
        } else if (attempts < 6) {
          // Webhook pas encore arrivé → on réessaie toutes les 2s (max 12s)
          setTimeout(() => poll(attempts + 1), 2000)
        } else {
          setLoading(false)
        }
      } catch {
        setError('Impossible de récupérer la réservation.')
        setLoading(false)
      }
    }

    poll()
  }, [sessionId])

  if (loading) return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-[#F5C84A] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#F5C84A] text-sm font-medium">Confirmation en cours...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center px-6 text-center">

      {/* Icône */}
      <div className="w-20 h-20 bg-[#F5C84A] rounded-full flex items-center justify-center text-[#1A3A6B] text-4xl font-bold mb-6 shadow-lg">
        ✓
      </div>

      <h1 className="text-2xl font-bold text-[#F5C84A] mb-2">Paiement confirmé !</h1>
      <p className="text-white/70 text-sm mb-8 max-w-xs leading-relaxed">
        Votre réservation VESTILIB est validée. Conservez votre code ci-dessous.
      </p>

      {/* Booking code */}
      {booking?.bookingCode && (
        <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-5 mb-6 w-full max-w-xs">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Code de réservation</p>
          <p className="text-[#F5C84A] text-3xl font-bold tracking-widest font-mono">
            {booking.bookingCode}
          </p>
        </div>
      )}

      {/* Détails */}
      {booking && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 w-full max-w-xs text-left space-y-2">
          <Row label="Montant payé"  value={`${booking.totalAmount} €`} />
          <Row label="Hôte reçoit"   value={`${booking.hostEarns} €`} />
          {booking.customerEmail && (
            <Row label="Email"       value={booking.customerEmail} />
          )}
        </div>
      )}

      {error && (
        <p className="text-red-300 text-sm mb-6 bg-red-900/30 px-4 py-2 rounded-lg">{error}</p>
      )}

      <Link
        href="/"
        className="bg-[#F5C84A] text-[#1A3A6B] font-semibold rounded-full px-8 py-3 text-sm hover:bg-yellow-300 transition-colors"
      >
        Retour à l'accueil
      </Link>

      <p className="text-white/30 text-xs mt-8">
        VESTILIB · Paiement sécurisé Stripe
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50 text-xs">{label}</span>
      <span className="text-white text-xs font-medium">{value}</span>
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1A3A6B] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#F5C84A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}