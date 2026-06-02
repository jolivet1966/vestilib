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

export default function HostDashboardPage() {
  const router = useRouter()
  const [hostId,   setHostId]   = useState<string | null>(null)
  const [host,     setHost]     = useState<HostData | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [balance,  setBalance]  = useState<Balance | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'reservations' | 'solde' | 'services' | 'disponibilite'>('reservations')

  // Services
  const [horaires,         setHoraires]         = useState<Horaires>(horairesDefaut)
  const [prestations,      setPrestations]      = useState<string[]>([])
  const [capaciteMax,      setCapaciteMax]      = useState(20)
  const [capaciteMaxMoto,  setCapaciteMaxMoto]  = useState(5)
  const [capaciteMaxVelo,  setCapaciteMaxVelo]  = useState(5)
  const [capaciteMaxDepot, setCapaciteMaxDepot] = useState(10)
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

  // Disponibilite
  const [ouvert,          setOuvert]          = useState(true)
  const [datesFermeture,  setDatesFermeture]  = useState<string[]>([])
  const [nouvelleDateFermeture, setNouvelleDateFermeture] = useState('')
  const [savingDispo,     setSavingDispo]     = useState(false)
  const [dispoMsg,        setDispoMsg]        = useState('')

  // Refus
  const [refusBookingId,  setRefusBookingId]  = useState<string | null>(null)
  const [motifRefus,      setMotifRefus]      = useState('')
  const [responding,      setResponding]      = useState(false)
  const [respondMsg,      setRespondMsg]      = useState('')

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

        if (hostData.horaires)   setHoraires(hostData.horaires)
        if (hostData.prestations) setPrestations(hostData.prestations)
        if (hostData.capaciteMax) setCapaciteMax(hostData.capaciteMax)
        if (hostData.capaciteMaxMoto) setCapaciteMaxMoto(hostData.capaciteMaxMoto)
        if (hostData.capaciteMaxVelo) setCapaciteMaxVelo(hostData.capaciteMaxVelo)
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

  const sauvegarderDispo = async () => {
    if (!hostId) return
    setSavingDispo(true); setDispoMsg('')
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db: firedb } = await import('@/lib/firebase')
      await updateDoc(doc(firedb, 'hosts', hostId), { ouvert, datesFermeture })
      setDispoMsg('Disponibilite mise a jour !')
      setHost(prev => prev ? { ...prev, ouvert, datesFermeture } : null)
    } catch { setDispoMsg('Erreur reseau.') }
    finally { setSavingDispo(false) }
  }

  const ajouterDateFermeture = () => {
    if (!nouvelleDateFermeture || datesFermeture.includes(nouvelleDateFermeture)) return
    setDatesFermeture(prev => [...prev, nouvelleDateFermeture].sort())
    setNouvelleDateFermeture('')
  }

  const supprimerDateFermeture = (date: string) => {
    setDatesFermeture(prev => prev.filter(d => d !== date))
  }

  const repondreReservation = async (bookingId: string, action: 'accept' | 'refuse') => {
    setResponding(true); setRespondMsg('')
    try {
      const res = await fetch('/api/respond-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, action, motifRefus: action === 'refuse' ? motifRefus : '' }),
      })
      const data = await res.json()
      if (!res.ok) { setRespondMsg(data.error ?? 'Erreur'); return }
      setRespondMsg(action === 'accept' ? 'Reservation acceptee — email envoye au client !' : 'Reservation refusee — client prevenu.')
      setRefusBookingId(null)
      setMotifRefus('')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action === 'accept' ? 'accepted' : 'refused' } : b))
    } catch { setRespondMsg('Erreur reseau.') }
    finally { setResponding(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalGagne  = bookings.filter(b => b.status === 'paid').reduce((s, b) => s + (b.hostEarns ?? 0), 0)
  const nbPayees    = bookings.filter(b => b.status === 'paid').length
  const nbEnAttente = bookings.filter(b => b.status === 'awaiting_approval').length

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':              return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Payee</span>
      case 'pending':           return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">En attente</span>
      case 'awaiting_approval': return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">A valider</span>
      case 'accepted':          return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Acceptee</span>
      case 'refused':           return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Refusee</span>
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
          <div className="flex items-center gap-3">
            {host && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${host.ouvert !== false ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {host.ouvert !== false ? 'Ouvert' : 'Ferme'}
              </span>
            )}
            <button onClick={handleLogout} className="text-white/50 hover:text-white text-xs transition-colors">
              Deconnexion
            </button>
          </div>
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
            <p className="text-2xl font-bold text-orange-500">{nbEnAttente}</p>
            <p className="text-xs text-gray-400 mt-1">A valider</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { key: 'reservations', label: 'Reservations' },
            { key: 'solde',        label: 'Solde' },
            { key: 'services',     label: 'Mes services' },
            { key: 'disponibilite', label: 'Disponibilite' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'bg-white text-gray-500 border border-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── RESERVATIONS ── */}
        {tab === 'reservations' && (
          <div className="space-y-3">
            {respondMsg && (
              <div className={`rounded-xl p-3 text-sm text-center font-medium ${respondMsg.includes('acceptee') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {respondMsg}
              </div>
            )}
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

                {booking.status === 'awaiting_approval' && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    {refusBookingId === booking.id ? (
                      <div className="space-y-2">
                        <input type="text" value={motifRefus} onChange={e => setMotifRefus(e.target.value)}
                          placeholder="Motif du refus (optionnel)"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A3A6B]" />
                        <div className="flex gap-2">
                          <button onClick={() => repondreReservation(booking.id, 'refuse')} disabled={responding}
                            className="flex-1 bg-red-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                            Confirmer le refus
                          </button>
                          <button onClick={() => setRefusBookingId(null)}
                            className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => repondreReservation(booking.id, 'accept')} disabled={responding}
                          className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                          Accepter
                        </button>
                        <button onClick={() => setRefusBookingId(booking.id)}
                          className="flex-1 bg-red-50 text-red-600 text-sm font-medium py-2 rounded-lg hover:bg-red-100 transition-colors">
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
                  <p className="text-xs text-[#1A3A6B] font-medium">Les virements sont effectues automatiquement le 1er du mois.</p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 text-sm">Solde non disponible.</p>
              </div>
            )}
          </div>
        )}

        {/* ── SERVICES ── */}
        {tab === 'services' && (
          <div className="space-y-5">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs text-yellow-800 font-medium">Attention : modification impossible si des reservations confirmees existent sur des creneaux futurs.</p>
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

        {/* ── DISPONIBILITE ── */}
        {tab === 'disponibilite' && (
          <div className="space-y-4">

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Statut de mon offre</p>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Mon point de depot est</p>
                  <p className="text-xs text-gray-400">{ouvert ? 'Visible et accessible aux clients' : 'Masque — les clients ne peuvent pas reserver'}</p>
                </div>
                <button onClick={() => setOuvert(!ouvert)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${ouvert ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${ouvert ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
              {!ouvert && (
                <div className="bg-red-50 rounded-lg p-3 mt-3">
                  <p className="text-xs text-red-600 font-medium">Votre offre est actuellement fermee. Les clients ne peuvent pas faire de nouvelles reservations.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Dates de fermeture exceptionnelle</p>
              <div className="flex gap-2 mb-4">
                <input type="date" value={nouvelleDateFermeture}
                  onChange={e => setNouvelleDateFermeture(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A3A6B]" />
                <button onClick={ajouterDateFermeture}
                  className="bg-[#1A3A6B] text-[#F5C84A] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0C2447] transition-colors">
                  Ajouter
                </button>
              </div>
              {datesFermeture.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">Aucune date de fermeture planifiee</p>
              ) : (
                <div className="space-y-2">
                  {datesFermeture.map(date => (
                    <div key={date} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-700">
                        {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <button onClick={() => supprimerDateFermeture(date)}
                        className="text-red-400 hover:text-red-600 text-xs transition-colors">
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dispoMsg && (
              <div className={`rounded-xl p-4 text-sm text-center font-medium ${dispoMsg.includes('jour') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {dispoMsg}
              </div>
            )}
            <button onClick={sauvegarderDispo} disabled={savingDispo}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
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