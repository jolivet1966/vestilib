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

export default function HostDashboardPage() {
  const router = useRouter()
  const [hostId,   setHostId]   = useState<string | null>(null)
  const [host,     setHost]     = useState<HostData | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [balance,  setBalance]  = useState<Balance | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'reservations' | 'solde' | 'services'>('reservations')

  // Formulaire services
  const [horaires,       setHoraires]       = useState<Horaires>(horairesDefaut)
  const [prestations,    setPrestations]    = useState<string[]>([])
  const [capaciteMax,    setCapaciteMax]    = useState(20)
  const [capaciteMaxMoto,  setCapaciteMaxMoto]  = useState(5)
  const [capaciteMaxVelo,  setCapaciteMaxVelo]  = useState(5)
  const [capaciteMaxDepot, setCapaciteMaxDepot] = useState(10)
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

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
        setHostId(hostDoc.id)
        setHost(hostData)

        // Pre-remplir formulaire services
        if (hostData.horaires) setHoraires(hostData.horaires)
        if (hostData.prestations) setPrestations(hostData.prestations)
        if (hostData.capaciteMax) setCapaciteMax(hostData.capaciteMax)
        if (hostData.capaciteMaxMoto) setCapaciteMaxMoto(hostData.capaciteMaxMoto)
        if (hostData.capaciteMaxVelo) setCapaciteMaxVelo(hostData.capaciteMaxVelo)
        if (hostData.capaciteMaxDepot) setCapaciteMaxDepot(hostData.capaciteMaxDepot)

        const bookSnap = await gd(q(col(firedb, 'bookings'), w('hostId', '==', hostDoc.id)))
        const bookingsList = bookSnap.docs.map(d => ({
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
        })) as Booking[]
        bookingsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setBookings(bookingsList)

        const balRes = await fetch(`/api/host-balance?hostId=${hostDoc.id}`)
        if (balRes.ok) setBalance(await balRes.json())

      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    })
    return () => unsub()
  }, [router])

  const handleLogout = async () => { await signOut(auth); router.push('/host/login') }

  const togglePrestation = (id: string) => {
    setPrestations(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const updateHoraire = (jour: string, field: keyof JourHoraire, value: string | boolean) => {
    setHoraires(prev => ({ ...prev, [jour]: { ...prev[jour as keyof Horaires], [field]: value } }))
  }

  const sauvegarderServices = async () => {
    if (!hostId) return
    setSaving(true); setSaveMsg('')
    try {
      const res = await fetch('/api/update-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, horaires, prestations, capaciteMax, capaciteMaxMoto, capaciteMaxVelo, capaciteMaxDepot }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveMsg(data.error ?? 'Erreur serveur'); return }
      setSaveMsg('Services mis a jour avec succes !')
    } catch { setSaveMsg('Erreur reseau.') }
    finally { setSaving(false) }
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
      case 'paid':    return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Payee</span>
      case 'pending': return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">En attente</span>
      case 'failed':  return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Echouee</span>
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1A3A6B] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[#F5C84A] font-bold tracking-widest">VESTILIB</h1>
            {host && <p className="text-white/60 text-xs mt-0.5">{host.prenom} {host.nom} · {host.ville}</p>}
          </div>
          <button onClick={handleLogout} className="text-white/50 hover:text-white text-xs transition-colors">
            Deconnexion
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-[#1A3A6B]">{nbPayees}</p>
            <p className="text-xs text-gray-400 mt-1">Reservations</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-[#1A3A6B]">{totalGagne.toFixed(0)}EUR</p>
            <p className="text-xs text-gray-400 mt-1">Total gagne</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-yellow-500">{nbEnAttente}</p>
            <p className="text-xs text-gray-400 mt-1">En attente</p>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab('reservations')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === 'reservations' ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'bg-white text-gray-500 border border-gray-100'}`}>
            Reservations
          </button>
          <button onClick={() => setTab('solde')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === 'solde' ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'bg-white text-gray-500 border border-gray-100'}`}>
            Solde
          </button>
          <button onClick={() => setTab('services')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === 'services' ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'bg-white text-gray-500 border border-gray-100'}`}>
            Mes services
          </button>
        </div>

        {tab === 'reservations' && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-gray-400 text-sm">Aucune reservation pour l instant.</p>
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
                    {booking.date && <p className="text-xs text-gray-500">📅 {new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>}
                    {booking.creneau && <p className="text-xs text-gray-500">🕐 {booking.creneau}</p>}
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Total : {booking.totalAmount}EUR</p>
                    <p className="text-sm font-semibold text-[#1A3A6B]">Vous : {booking.hostEarns}EUR</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'solde' && (
          <div className="space-y-4">
            {balance ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Disponible</p>
                    <p className="text-2xl font-bold text-green-600">{balance.available.toFixed(2)}EUR</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">En attente</p>
                    <p className="text-2xl font-bold text-yellow-500">{balance.pending.toFixed(2)}EUR</p>
                  </div>
                </div>
                {balance.recentPayouts.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Derniers virements</p>
                    <div className="space-y-2">
                      {balance.recentPayouts.map(p => (
                        <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.amount.toFixed(2)}EUR</p>
                            <p className="text-xs text-gray-400">{p.arrivalDate}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {p.status === 'paid' ? 'Verse' : 'En cours'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-[#1A3A6B]/5 rounded-xl p-4 border border-[#1A3A6B]/10">
                  <p className="text-xs text-[#1A3A6B] font-medium">Les virements sont effectues automatiquement le 1er de chaque mois sur votre IBAN.</p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 text-sm">Solde non disponible — l onboarding Stripe doit etre complete.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'services' && (
          <div className="space-y-5">

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs text-yellow-800 font-medium">Attention : toute modification est impossible si des reservations confirmees existent sur des creneaux futurs.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Horaires d ouverture</p>
              <div className="space-y-3">
                {JOURS.map(jour => (
                  <div key={jour} className="flex items-center gap-3">
                    <div className="w-24 flex items-center gap-2">
                      <input type="checkbox" checked={horaires[jour]?.ouvert ?? false}
                        onChange={e => updateHoraire(jour, 'ouvert', e.target.checked)}
                        className="w-4 h-4 accent-[#1A3A6B]" />
                      <span className="text-sm text-gray-700 font-medium">{JOURS_LABELS[jour]}</span>
                    </div>
                    {horaires[jour]?.ouvert ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={horaires[jour]?.ouverture ?? '09:00'}
                          onChange={e => updateHoraire(jour, 'ouverture', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A3A6B]" />
                        <span className="text-gray-400 text-xs">-</span>
                        <input type="time" value={horaires[jour]?.fermeture ?? '19:00'}
                          onChange={e => updateHoraire(jour, 'fermeture', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A3A6B]" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Ferme</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Prestations</p>
              <div className="space-y-5">
                {CATEGORIES.map(cat => {
                  const tarifs = TARIFS_VESTILIB.filter(t => t.categorie === cat)
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cat}</p>
                      <div className="space-y-2">
                        {tarifs.map(tarif => (
                          <label key={tarif.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                            prestations.includes(tarif.id) ? 'border-[#1A3A6B] bg-[#1A3A6B]/5' : 'border-gray-100 hover:border-gray-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={prestations.includes(tarif.id)}
                                onChange={() => togglePrestation(tarif.id)}
                                className="w-4 h-4 accent-[#1A3A6B]" />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{tarif.label}</p>
                                <p className="text-xs text-gray-400">{tarif.description}</p>
                              </div>
                            </div>
                            <span className={`text-sm font-semibold ${tarif.prix < 0 ? 'text-green-600' : 'text-[#1A3A6B]'}`}>
                              {tarif.prix < 0 ? `-${Math.abs(tarif.prix)}` : `${tarif.prix}`}EUR
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Capacites maximales</p>
              <div className="space-y-4">
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
              <div className={`rounded-xl p-4 text-sm text-center font-medium ${saveMsg.includes('succes') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {saveMsg}
              </div>
            )}

            <button onClick={sauvegarderServices} disabled={saving}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
              {saving ? 'Sauvegarde...' : 'Sauvegarder mes services'}
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
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-600 mb-3">{label}</p>
      <div className="flex items-center gap-4">
        <button onClick={() => onChange(Math.max(1, value - 1))}
          className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-600 text-lg flex items-center justify-center hover:bg-gray-100">-</button>
        <div className="flex-1 text-center">
          <p className="text-3xl font-black text-[#1A3A6B]">{value}</p>
          <p className="text-xs text-gray-400">{unite} max / creneau</p>
        </div>
        <button onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-full bg-[#1A3A6B] text-[#F5C84A] text-lg flex items-center justify-center hover:bg-[#0C2447]">+</button>
      </div>
    </div>
  )
}