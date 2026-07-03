'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { TARIFS_VESTILIB, CATEGORIES } from '@/lib/tarifs'
import type { Horaires, JourHoraire } from '@/types'

interface Booking {
  id: string; bookingCode: string; totalAmount: number
  hostEarns: number; status: string; customerEmail?: string
  date?: string; creneau?: string; createdAt: any
}
interface HostData {
  prenom: string; nom: string; ville: string
  stripeAccountId: string; stripePayoutsEnabled: boolean
  horaires?: Horaires; prestations?: string[]
  capaciteMax?: number; capaciteMaxMoto?: number
  capaciteMaxVelo?: number; capaciteMaxDepot?: number
  ouvert?: boolean; datesFermeture?: string[]
}
interface Balance {
  available: number; pending: number; currency: string
  recentPayouts: { id: string; amount: number; status: string; arrivalDate: string }[]
}

const JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'] as const
const JOURS_LABELS: Record<string, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
}
const horairesDefaut: Horaires = Object.fromEntries(
  JOURS.map(j => [j, { ouvert: j !== 'dimanche', ouverture: '09:00', fermeture: '19:00' }])
) as Horaires

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start)
  const endDate = new Date(end)
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function grouperPeriodes(dates: string[]): string[] {
  if (dates.length === 0) return []
  const sorted = [...dates].sort()
  const periodes: string[] = []
  let debut = sorted[0]
  let fin = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(fin + 'T12:00:00')
    prev.setDate(prev.getDate() + 1)
    if (prev.toISOString().split('T')[0] === sorted[i]) {
      fin = sorted[i]
    } else {
      periodes.push(debut === fin
        ? `Le ${new Date(debut + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
        : `Du ${new Date(debut + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${new Date(fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`)
      debut = sorted[i]; fin = sorted[i]
    }
  }
  periodes.push(debut === fin
    ? `Le ${new Date(debut + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
    : `Du ${new Date(debut + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${new Date(fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  return periodes
}

export default function HostDashboardPage() {
  const router = useRouter()
  const [hostId,   setHostId]   = useState<string | null>(null)
  const [host,     setHost]     = useState<HostData | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [balance,  setBalance]  = useState<Balance | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'reservations' | 'solde' | 'services' | 'disponibilite'>('reservations')

  const [horaires,         setHoraires]         = useState<Horaires>(horairesDefaut)
  const [prestations,      setPrestations]      = useState<string[]>([])
  const [capaciteMax,      setCapaciteMax]      = useState(20)
  const [capaciteMaxMoto,  setCapaciteMaxMoto]  = useState(5)
  const [capaciteMaxVelo,  setCapaciteMaxVelo]  = useState(5)
  const [capaciteMaxDepot, setCapaciteMaxDepot] = useState(10)
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

  const [ouvert,         setOuvert]         = useState(true)
  const [datesFermeture, setDatesFermeture] = useState<string[]>([])
  const [dateDebut,      setDateDebut]      = useState('')
  const [dateFin,        setDateFin]        = useState('')
  const [savingDispo,    setSavingDispo]    = useState(false)
  const [dispoMsg,       setDispoMsg]       = useState('')

  const [refusBookingId, setRefusBookingId] = useState<string | null>(null)
  const [motifRefus,     setMotifRefus]     = useState('')
  const [responding,     setResponding]     = useState(false)
  const [respondMsg,     setRespondMsg]     = useState('')

  // Archivage local
  const [bookingsArchives, setBookingsArchives] = useState<Set<string>>(new Set())
  const [bookingsSupprime, setBookingsSupprime] = useState<Set<string>>(new Set())
  const [showArchives,     setShowArchives]     = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('vestilib_bookings_archives_host')
    if (stored) setBookingsArchives(new Set(JSON.parse(stored)))
    const stored2 = localStorage.getItem('vestilib_bookings_supprimes_host')
    if (stored2) setBookingsSupprime(new Set(JSON.parse(stored2)))
  }, [])

  const archiverBooking = (id: string) => {
    setBookingsArchives(prev => {
      const next = new Set(Array.from(prev)); next.add(id)
      localStorage.setItem('vestilib_bookings_archives_host', JSON.stringify(Array.from(next)))
      return next
    })
  }
  const desarchiverBooking = (id: string) => {
    setBookingsArchives(prev => {
      const next = new Set(Array.from(prev)); next.delete(id)
      localStorage.setItem('vestilib_bookings_archives_host', JSON.stringify(Array.from(next)))
      return next
    })
  }
  const supprimerBooking = (id: string) => {
    setBookingsSupprime(prev => {
      const next = new Set(Array.from(prev)); next.add(id)
      localStorage.setItem('vestilib_bookings_supprimes_host', JSON.stringify(Array.from(next)))
      return next
    })
    desarchiverBooking(id)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.push('/host/login'); return }
      try {
        const { collection: col, query: q, where: w, getDocs: gd } = await import('firebase/firestore')
        const { db: firedb } = await import('@/lib/firebase')
        const snap = await gd(q(col(firedb, 'hosts'), w('email', '==', user.email)))
        if (snap.empty) { router.push('/host/login'); return }
        const hostDoc = snap.docs[0]
        const hostData = hostDoc.data() as HostData
        setHostId(hostDoc.id); setHost(hostData)
        if (hostData.horaires)       setHoraires(hostData.horaires)
        if (hostData.prestations)    setPrestations(hostData.prestations)
        if (hostData.capaciteMax)    setCapaciteMax(hostData.capaciteMax)
        if (hostData.capaciteMaxMoto)  setCapaciteMaxMoto(hostData.capaciteMaxMoto)
        if (hostData.capaciteMaxVelo)  setCapaciteMaxVelo(hostData.capaciteMaxVelo)
        if (hostData.capaciteMaxDepot) setCapaciteMaxDepot(hostData.capaciteMaxDepot)
        setOuvert(hostData.ouvert !== false)
        setDatesFermeture(hostData.datesFermeture ?? [])
        const bookSnap = await gd(q(col(firedb, 'bookings'), w('hostId', '==', hostDoc.id)))
        const list = bookSnap.docs.map(d => ({
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
        })) as Booking[]
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setBookings(list)
        const { updateDoc, doc: docRef } = await import('firebase/firestore')
        const msgSnap = await gd(q(col(firedb, 'messages'), w('hostId', '==', hostDoc.id), w('lu', '==', false)))
        await Promise.all(msgSnap.docs.map(d => updateDoc(docRef(firedb, 'messages', d.id), { lu: true })))
        const balRes = await fetch(`/api/host-balance?hostId=${hostDoc.id}`)
        if (balRes.ok) setBalance(await balRes.json())
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    })
    return () => unsub()
  }, [router])

  const handleLogout = async () => { await signOut(auth); router.push('/host/login') }

  const togglePrestation = (id: string) =>
    setPrestations(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

  const updateHoraire = (jour: string, field: keyof JourHoraire, value: string | boolean) =>
    setHoraires(prev => ({ ...prev, [jour]: { ...prev[jour as keyof Horaires], [field]: value } }))

  const sauvegarderServices = async () => {
    if (!hostId) return
    setSaving(true); setSaveMsg('')
    try {
      const res = await fetch('/api/update-host', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, horaires, prestations, capaciteMax, capaciteMaxMoto, capaciteMaxVelo, capaciteMaxDepot }),
      })
      const data = await res.json()
      setSaveMsg(res.ok ? 'Services mis a jour avec succes !' : (data.error ?? 'Erreur serveur'))
    } catch { setSaveMsg('Erreur reseau.') }
    finally { setSaving(false) }
  }

  const ajouterPeriodeFermeture = () => {
    if (!dateDebut) return
    const fin = dateFin || dateDebut
    const nouvelles = getDatesInRange(dateDebut, fin).filter(d => !datesFermeture.includes(d))
    if (nouvelles.length === 0) return
    setDatesFermeture(prev => [...prev, ...nouvelles].sort())
    setDateDebut(''); setDateFin('')
  }

  const sauvegarderDispo = async () => {
    if (!hostId) return
    setSavingDispo(true); setDispoMsg('')
    try {
      const res = await fetch('/api/update-disponibilite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, ouvert, datesFermeture }),
      })
      const data = await res.json()
      if (res.ok) { setDispoMsg('Disponibilite mise a jour !'); setHost(prev => prev ? { ...prev, ouvert, datesFermeture } : null) }
      else setDispoMsg(data.error ?? 'Erreur serveur')
    } catch { setDispoMsg('Erreur reseau.') }
    finally { setSavingDispo(false) }
  }

  const annulerReservation = async (bookingId: string) => {
  if (!window.confirm('Confirmer l\'annulation ? Cette action est irréversible.')) return
  try {
    const res = await fetch('/api/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, cancelledBy: 'hote' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Erreur')
    setBookings(prev => prev.filter(b => b.id !== bookingId))
    alert('Réservation annulée.')
  } catch (e: any) {
    alert(`Erreur : ${e.message}`)
  }
}

const repondreReservation = async (bookingId: string, action: 'accept' | 'refuse') => {
    setResponding(true); setRespondMsg('')
    try {
      const res = await fetch('/api/respond-booking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, action, motifRefus: action === 'refuse' ? motifRefus : '' }),
      })
      const data = await res.json()
      if (!res.ok) { setRespondMsg(data.error ?? 'Erreur'); return }
      setRespondMsg(action === 'accept' ? 'Reservation acceptee — email envoye au client !' : 'Reservation refusee — client prevenu.')
      setRefusBookingId(null); setMotifRefus('')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action === 'accept' ? 'accepted' : 'refused' } : b))
    } catch { setRespondMsg('Erreur reseau.') }
    finally { setResponding(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    </div>
  )

  const totalGagne  = bookings.filter(b => b.status === 'paid').reduce((s, b) => s + (b.hostEarns ?? 0), 0)
  const nbPayees    = bookings.filter(b => b.status === 'paid').length
  const nbEnAttente = bookings.filter(b => b.status === 'awaiting_approval').length

  const bookingsVisibles  = bookings.filter(b => !bookingsSupprime.has(b.id) && !bookingsArchives.has(b.id))
  const bookingsArchivees = bookings.filter(b => !bookingsSupprime.has(b.id) && bookingsArchives.has(b.id))

  const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    paid:              { label: 'Payee',      color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    pending:           { label: 'En attente', color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500'   },
    awaiting_approval: { label: 'A valider',  color: 'text-orange-700',  bg: 'bg-orange-50',  dot: 'bg-orange-500'  },
    accepted:          { label: 'Acceptee',   color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500'    },
    refused:           { label: 'Refusee',    color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500'     },
authorized:        { label: 'Paiement autorisé', color: 'text-violet-700', bg: 'bg-violet-50', dot: 'bg-violet-500' },
  }

  const statusBadge = (status: string) => {
    const s = statusConfig[status]
    if (!s) return null
    return (
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${s.color} ${s.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} inline-block`} />
        {s.label}
      </span>
    )
  }

  const TABS = [
    { key: 'reservations',  label: 'Reservations', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { key: 'solde',         label: 'Solde',         icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { key: 'services',      label: 'Mes services',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
    { key: 'disponibilite', label: 'Disponibilite', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FC]">

      {/* HEADER */}
      <div className="bg-[#1A3A6B] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #F5C84A 0%, transparent 60%)' }} />
        <div className="relative px-4 pt-8 pb-5 max-w-2xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[#F5C84A] font-black tracking-widest text-sm">VESTILIB</p>
              {host && <p className="text-white font-bold text-lg mt-0.5">{host.prenom} {host.nom}</p>}
              {host && <p className="text-white/50 text-xs mt-0.5">{host.ville}</p>}
            </div>
            <div className="flex items-center gap-2">
              {host && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  host.ouvert !== false
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                }`}>
                  {host.ouvert !== false ? '● Ouvert' : '○ Ferme'}
                </span>
              )}
              <button onClick={handleLogout}
                className="text-white/40 hover:text-white/70 text-xs transition-colors px-2 py-1">
                Deconnexion
              </button>
            </div>
          </div>

          {/* BANDEAU GAINS */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
              <p className="text-lg font-black text-[#F5C84A] leading-none">{nbPayees}</p>
              <p className="text-white/50 text-[10px] mt-1 font-medium uppercase tracking-wide">Reservations</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
              <p className="text-lg font-black text-emerald-400 leading-none">{totalGagne.toFixed(0)}<span className="text-xs font-bold">€</span></p>
              <p className="text-white/50 text-[10px] mt-1 font-medium uppercase tracking-wide">Total gagne</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
              <p className="text-lg font-black text-amber-400 leading-none">{nbEnAttente}</p>
              <p className="text-white/50 text-[10px] mt-1 font-medium uppercase tracking-wide">A valider</p>
            </div>
          </div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 min-w-[80px] py-3 text-xs font-semibold border-b-2 transition-all flex flex-col items-center gap-1 ${
                tab === t.key ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* ===== RESERVATIONS ===== */}
        {tab === 'reservations' && (
          <div className="space-y-3">
            {respondMsg && (
              <div className={`rounded-2xl p-3 text-sm text-center font-medium ${respondMsg.includes('acceptee') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {respondMsg}
              </div>
            )}

            {bookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">📭</div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Aucune reservation</p>
                <p className="text-xs text-gray-400">Les reservations apparaitront ici</p>
              </div>
            ) : (
              <>
                {bookingsVisibles.map(booking => {
                  const archivable = ['paid', 'refused'].includes(booking.status)
                  return (
                    <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Barre statut */}
                      <div className={`h-1 w-full ${statusConfig[booking.status]?.dot ?? 'bg-gray-200'}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-mono font-bold text-[#1A3A6B] text-base">{booking.bookingCode || '—'}</p>
                            {booking.customerEmail && <p className="text-xs text-gray-400 mt-0.5">{booking.customerEmail}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {statusBadge(booking.status)}
                            {archivable && (
                              <button onClick={() => archiverBooking(booking.id)}
                                title="Archiver"
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                                  <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
                                  <line x1="10" y1="12" x2="14" y2="12"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {(booking.date || booking.creneau) && (
                          <div className="flex gap-3 mb-3">
                            {booking.date && (
                              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                {new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                            {booking.creneau && (
                              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                {booking.creneau}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                          <p className="text-xs text-gray-300">
                            {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Total : {booking.totalAmount}€</p>
                            <p className="text-sm font-bold text-emerald-700">Vous : {booking.hostEarns}€</p>
                          </div>
                        </div>

                        {booking.status === 'authorized' && booking.date && (() => {
  const datePrestation = new Date(booking.date + 'T00:00:00')
  const dans48h = new Date(Date.now() + 48 * 60 * 60 * 1000)
  if (datePrestation > dans48h) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => annulerReservation(booking.id)}
            className="flex-1 border border-red-200 text-red-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-red-50 active:scale-95 transition-all">
            Annuler la réservation
          </button>
          <button
            onClick={() => alert('Vous pouvez annuler cette réservation jusqu\'à 48 heures avant la date de début de la prestation.')}
            className="w-7 h-7 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors"
            title="Information annulation">
            <span className="text-gray-400 text-xs font-bold">i</span>
          </button>
        </div>
      </div>
    )
  }
  return null
})()}
{booking.status === 'awaiting_approval' && (
                          <div className="mt-3 pt-3 border-t border-gray-50">
                            {refusBookingId === booking.id ? (
                              <div className="space-y-2">
                                <input type="text" value={motifRefus} onChange={e => setMotifRefus(e.target.value)}
                                  placeholder="Motif du refus (optionnel)"
                                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1A3A6B]" />
                                <div className="flex gap-2">
                                  <button onClick={() => repondreReservation(booking.id, 'refuse')} disabled={responding}
                                    className="flex-1 bg-red-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                                    Confirmer le refus
                                  </button>
                                  <button onClick={() => setRefusBookingId(null)}
                                    className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button onClick={() => repondreReservation(booking.id, 'accept')} disabled={responding}
                                  className="flex-1 bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                  Accepter
                                </button>
                                <button onClick={() => setRefusBookingId(booking.id)}
                                  className="flex-1 bg-red-50 text-red-600 text-sm font-bold py-2.5 rounded-xl hover:bg-red-100 transition-colors">
                                  Refuser
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* ARCHIVES */}
                {bookingsArchivees.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Archives ({bookingsArchivees.length})</p>
                      <button onClick={() => setShowArchives(!showArchives)}
                        className="text-xs text-[#1A3A6B] font-semibold hover:underline flex items-center gap-1">
                        {showArchives ? 'Masquer' : 'Voir'}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`transition-transform ${showArchives ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>
                    </div>
                    {showArchives && (
                      <div className="rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2.5 flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-500">{bookingsArchivees.length} archivee{bookingsArchivees.length > 1 ? 's' : ''}</p>
                          <button onClick={() => {
                            if (window.confirm('Supprimer toutes les reservations archivees ?')) {
                              bookingsArchivees.forEach(b => supprimerBooking(b.id))
                              setShowArchives(false)
                            }
                          }} className="text-[10px] text-red-400 hover:text-red-600 font-semibold">
                            Tout supprimer
                          </button>
                        </div>
                        {bookingsArchivees.map((booking, i) => (
                          <div key={booking.id} className={`bg-white px-4 py-3 flex items-center justify-between ${i < bookingsArchivees.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono font-bold text-gray-400 text-sm">{booking.bookingCode}</p>
                              {booking.date && <p className="text-xs text-gray-300">{new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                              <p className="text-xs text-gray-300">{booking.hostEarns}€ encaisse</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => desarchiverBooking(booking.id)} title="Restaurer"
                                className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 hover:border-[#1A3A6B] flex items-center justify-center transition-colors">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.76"/>
                                </svg>
                              </button>
                              <button onClick={() => { if (window.confirm('Supprimer definitivement ?')) supprimerBooking(booking.id) }}
                                title="Supprimer" className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== SOLDE ===== */}
        {tab === 'solde' && (
          <div className="space-y-4">
            {balance ? (
              <>
                {/* Résumé solde */}
                <div className="bg-[#1A3A6B] rounded-2xl p-5 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5C84A]/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="grid grid-cols-2 gap-4 relative">
                    <div className="text-center">
                      <p className="text-white/50 text-[10px] font-medium uppercase tracking-wide mb-1">Disponible</p>
                      <p className="text-2xl font-black text-emerald-400 leading-none">{balance.available.toFixed(2)}<span className="text-sm font-bold">€</span></p>
                    </div>
                    <div className="text-center border-l border-white/10">
                      <p className="text-white/50 text-[10px] font-medium uppercase tracking-wide mb-1">En attente</p>
                      <p className="text-2xl font-black text-amber-400 leading-none">{balance.pending.toFixed(2)}<span className="text-sm font-bold">€</span></p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 text-center">
                    <p className="text-white/40 text-xs">Total gagne depuis le debut</p>
                    <p className="text-white font-black text-xl mt-0.5">{totalGagne.toFixed(2)}<span className="text-sm font-bold">€</span></p>
                  </div>
                </div>

                {balance.recentPayouts.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Derniers virements</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {balance.recentPayouts.map(p => (
                        <div key={p.id} className="flex justify-between items-center px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{p.amount.toFixed(2)}€</p>
                            <p className="text-xs text-gray-400">{p.arrivalDate}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {p.status === 'paid' ? 'Verse' : 'En cours'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#1A3A6B]/5 rounded-2xl p-4 border border-[#1A3A6B]/10 flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A3A6B" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-xs text-[#1A3A6B] font-medium">Les virements sont effectues automatiquement le 1er du mois via Stripe Connect.</p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">Solde non disponible</p>
                <p className="text-xs text-gray-400 mt-1">Verifiez votre connexion Stripe</p>
              </div>
            )}
          </div>
        )}

        {/* ===== SERVICES ===== */}
        {tab === 'services' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-xs text-amber-800 font-medium">Modification impossible si des reservations confirmees existent sur des creneaux futurs.</p>
            </div>

            {/* Horaires */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Horaires d ouverture</p>
              </div>
              <div className="divide-y divide-gray-50">
                {JOURS.map(jour => (
                  <div key={jour} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={horaires[jour]?.ouvert ?? false}
                        onChange={e => updateHoraire(jour, 'ouvert', e.target.checked)}
                        className="w-4 h-4 accent-[#1A3A6B] flex-shrink-0" />
                      <span className={`text-sm font-semibold ${horaires[jour]?.ouvert ? 'text-gray-800' : 'text-gray-400'}`}>
                        {JOURS_LABELS[jour]}
                      </span>
                    </div>
                    {horaires[jour]?.ouvert ? (
                      <div className="flex items-center gap-2 ml-6">
                        <input type="time" value={horaires[jour]?.ouverture ?? '09:00'}
                          onChange={e => updateHoraire(jour, 'ouverture', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:border-[#1A3A6B] bg-gray-50" />
                        <span className="text-gray-300 text-xs font-bold flex-shrink-0">—</span>
                        <input type="time" value={horaires[jour]?.fermeture ?? '19:00'}
                          onChange={e => updateHoraire(jour, 'fermeture', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:border-[#1A3A6B] bg-gray-50" />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 italic ml-6">Ferme</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Prestations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prestations proposees</p>
              </div>
              <div className="p-4 space-y-5">
                {CATEGORIES.map(cat => {
                  const tarifs = TARIFS_VESTILIB.filter(t => t.categorie === cat)
                  return (
                    <div key={cat}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{cat}</p>
                      <div className="space-y-2">
                        {tarifs.map(tarif => (
                          <label key={tarif.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            prestations.includes(tarif.id)
                              ? 'border-[#1A3A6B] bg-[#1A3A6B]/5'
                              : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                          }`}>
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={prestations.includes(tarif.id)}
                                onChange={() => togglePrestation(tarif.id)}
                                className="w-4 h-4 accent-[#1A3A6B] flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{tarif.label}</p>
                                <p className="text-xs text-gray-400">{tarif.description}</p>
                              </div>
                            </div>
                            <span className={`text-sm font-bold flex-shrink-0 ml-2 ${tarif.prix < 0 ? 'text-emerald-600' : 'text-[#1A3A6B]'}`}>
                              {tarif.prix < 0 ? `-${Math.abs(tarif.prix)}` : tarif.prix}€
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Capacites */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Capacites maximales</p>
              </div>
              <div className="p-4 space-y-3">
                {prestations.some(p => p.startsWith('4h-') || p.startsWith('8h-')) && (
                  <CapaciteSelector label="Consigne articles" value={capaciteMax} onChange={setCapaciteMax} unite="articles" />
                )}
                {prestations.includes('parking-moto') && (
                  <CapaciteSelector label="Parking moto" value={capaciteMaxMoto} onChange={setCapaciteMaxMoto} unite="motos" />
                )}
                {prestations.includes('parking-velo') && (
                  <CapaciteSelector label="Parking velo" value={capaciteMaxVelo} onChange={setCapaciteMaxVelo} unite="velos" />
                )}
                {prestations.some(p => p === 'depot-24h' || p === 'depot-7j') && (
                  <CapaciteSelector label="Depot longue duree" value={capaciteMaxDepot} onChange={setCapaciteMaxDepot} unite="articles" />
                )}
              </div>
            </div>

            {saveMsg && (
              <div className={`rounded-2xl p-4 text-sm text-center font-medium ${saveMsg.includes('succes') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {saveMsg}
              </div>
            )}
            <button onClick={sauvegarderServices} disabled={saving}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-bold py-3 rounded-2xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
              {saving ? 'Sauvegarde...' : 'Sauvegarder mes services'}
            </button>
          </div>
        )}

        {/* ===== DISPONIBILITE ===== */}
        {tab === 'disponibilite' && (
          <div className="space-y-4">

            {/* Statut ouvert/fermé */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Statut de mon point de depot</p>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 mb-0.5">
                      {ouvert ? 'Ouvert aux reservations' : 'Ferme aux reservations'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {ouvert ? 'Les clients peuvent voir et reserver votre point de depot' : 'Votre point de depot est masque des clients'}
                    </p>
                  </div>
                  <button onClick={() => setOuvert(!ouvert)}
                    className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${ouvert ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${ouvert ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                {!ouvert && (
                  <div className="mt-3 bg-red-50 rounded-xl p-3 border border-red-100">
                    <p className="text-xs text-red-600 font-medium">Votre offre est actuellement fermee aux nouveaux clients.</p>
                  </div>
                )}
                {ouvert && (
                  <div className="mt-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <p className="text-xs text-emerald-700 font-medium">Votre offre est visible et active.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fermetures exceptionnelles */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fermetures exceptionnelles</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">Date de debut</label>
                    <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">Date de fin</label>
                    <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                      min={dateDebut || new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] bg-gray-50" />
                  </div>
                </div>
                <button onClick={ajouterPeriodeFermeture} disabled={!dateDebut}
                  className="w-full bg-[#1A3A6B] text-[#F5C84A] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0C2447] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Ajouter la periode
                </button>
              </div>

              {datesFermeture.length === 0 ? (
                <div className="px-4 pb-4 text-center">
                  <p className="text-xs text-gray-300">Aucune fermeture planifiee</p>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500">{datesFermeture.length} jour{datesFermeture.length > 1 ? 's' : ''} ferme{datesFermeture.length > 1 ? 's' : ''}</p>
                    <button onClick={() => setDatesFermeture([])}
                      className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors">
                      Tout effacer
                    </button>
                  </div>
                  {grouperPeriodes(datesFermeture).map((periode, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" className="flex-shrink-0">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <p className="text-xs text-red-600 font-semibold">{periode}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dispoMsg && (
              <div className={`rounded-2xl p-4 text-sm text-center font-medium ${dispoMsg.includes('jour') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {dispoMsg}
              </div>
            )}
            <button onClick={sauvegarderDispo} disabled={savingDispo}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-bold py-3 rounded-2xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
              {savingDispo ? 'Sauvegarde...' : 'Sauvegarder la disponibilite'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function CapaciteSelector({ label, value, onChange, unite }: {
  label: string; value: number; onChange: (v: number) => void; unite: string
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-4">
        <button onClick={() => onChange(Math.max(1, value - 1))}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 text-xl flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-colors font-bold">
          -
        </button>
        <div className="flex-1 text-center">
          <p className="text-2xl font-black text-[#1A3A6B] leading-none">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{unite} max / creneau</p>
        </div>
        <button onClick={() => onChange(value + 1)}
          className="w-10 h-10 rounded-xl bg-[#1A3A6B] text-[#F5C84A] text-xl flex items-center justify-center hover:bg-[#0C2447] transition-colors font-bold">
          +
        </button>
      </div>
    </div>
  )
}