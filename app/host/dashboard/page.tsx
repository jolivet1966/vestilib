'use client'
// app/host/dashboard/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import Link from 'next/link'

interface Booking {
  id:          string
  bookingCode: string
  totalAmount: number
  hostEarns:   number
  status:      string
  customerEmail?: string
  date?:       string
  creneau?:    string
  createdAt:   any
}

interface HostData {
  prenom:          string
  nom:             string
  ville:           string
  stripeAccountId: string
  stripePayoutsEnabled: boolean
}

interface Balance {
  available:     number
  pending:       number
  currency:      string
  recentPayouts: { id: string; amount: number; status: string; arrivalDate: string }[]
}

export default function HostDashboardPage() {
  const router = useRouter()

  const [hostId,   setHostId]   = useState<string | null>(null)
  const [host,     setHost]     = useState<HostData | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [balance,  setBalance]  = useState<Balance | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'reservations' | 'solde'>('reservations')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.push('/host/login'); return }

      try {
        // Récupérer le document hôte via l'email Firebase
        const { collection: col, query: q, where: w, getDocs: gd } = await import('firebase/firestore')
        const { db: firedb } = await import('@/lib/firebase')

        const snap = await gd(q(col(firedb, 'hosts'), w('email', '==', user.email)))
        if (snap.empty) { router.push('/host/login'); return }

        const hostDoc = snap.docs[0]
        setHostId(hostDoc.id)
        setHost(hostDoc.data() as HostData)

        // Récupérer les réservations
        const bookSnap = await gd(
          q(col(firedb, 'bookings'),
            w('hostId', '==', hostDoc.id),
          )
        )
        const bookingsList = bookSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
        })) as Booking[]

        // Trier par date décroissante
        bookingsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setBookings(bookingsList)

        // Récupérer le solde Stripe
        const balRes = await fetch(`/api/host-balance?hostId=${hostDoc.id}`)
        if (balRes.ok) {
          const balData = await balRes.json()
          setBalance(balData)
        }

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [router])

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/host/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalGagne  = bookings.filter(b => b.status === 'paid').reduce((s, b) => s + (b.hostEarns ?? 0), 0)
  const nbPayees    = bookings.filter(b => b.status === 'paid').length
  const nbEnAttente = bookings.filter(b => b.status === 'pending').length

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':    return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Payée</span>
      case 'pending': return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">En attente</span>
      case 'failed':  return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Échouée</span>
      default:        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-[#1A3A6B] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[#F5C84A] font-bold tracking-widest">VESTILIB</h1>
            {host && <p className="text-white/60 text-xs mt-0.5">{host.prenom} {host.nom} · {host.ville}</p>}
          </div>
          <button onClick={handleLogout} className="text-white/50 hover:text-white text-xs transition-colors">
            Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-[#1A3A6B]">{nbPayees}</p>
            <p className="text-xs text-gray-400 mt-1">Réservations</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-[#1A3A6B]">{totalGagne.toFixed(0)}€</p>
            <p className="text-xs text-gray-400 mt-1">Total gagné</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-yellow-500">{nbEnAttente}</p>
            <p className="text-xs text-gray-400 mt-1">En attente</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('reservations')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === 'reservations' ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            Réservations
          </button>
          <button
            onClick={() => setTab('solde')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === 'solde' ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            Solde & Virements
          </button>
        </div>

        {/* ── RÉSERVATIONS ── */}
        {tab === 'reservations' && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-gray-400 text-sm">Aucune réservation pour l'instant.</p>
              </div>
            ) : bookings.map(booking => (
              <div key={booking.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono font-bold text-[#1A3A6B] text-sm">{booking.bookingCode || '—'}</p>
                    {booking.customerEmail && <p className="text-xs text-gray-400">{booking.customerEmail}</p>}
                  </div>
                  {statusBadge(booking.status)}
                </div>

                {(booking.date || booking.creneau) && (
                  <div className="flex gap-3 mb-2">
                    {booking.date && (
                      <p className="text-xs text-gray-500">
                        📅 {new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                    {booking.creneau && <p className="text-xs text-gray-500">🕐 {booking.creneau}</p>}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Total : {booking.totalAmount}€</p>
                    <p className="text-sm font-semibold text-[#1A3A6B]">Vous : {booking.hostEarns}€</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SOLDE ── */}
        {tab === 'solde' && (
          <div className="space-y-4">
            {balance ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Disponible</p>
                    <p className="text-2xl font-bold text-green-600">{balance.available.toFixed(2)}€</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">En attente</p>
                    <p className="text-2xl font-bold text-yellow-500">{balance.pending.toFixed(2)}€</p>
                  </div>
                </div>

                {balance.recentPayouts.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Derniers virements</p>
                    <div className="space-y-2">
                      {balance.recentPayouts.map(p => (
                        <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.amount.toFixed(2)}€</p>
                            <p className="text-xs text-gray-400">{p.arrivalDate}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {p.status === 'paid' ? 'Versé' : 'En cours'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#1A3A6B]/5 rounded-xl p-4 border border-[#1A3A6B]/10">
                  <p className="text-xs text-[#1A3A6B] font-medium">ℹ️ Les virements sont effectués automatiquement le 1er de chaque mois sur votre IBAN.</p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 text-sm">Solde non disponible — l'onboarding Stripe doit être complété.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}