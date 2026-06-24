'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { TARIFS_VESTILIB, CATEGORIES, REMISE_INFO } from '@/lib/tarifs'

interface JourHoraire { ouvert: boolean; ouverture: string; fermeture: string }
interface Host {
  id: string; prenom: string; nom: string; email: string; telephone: string
  adresse: string; codePostal: string; ville: string
  horaires: Record<string, JourHoraire>
  prestations: string[]
  capaciteMax?: number; capaciteMaxMoto?: number
  capaciteMaxVelo?: number; capaciteMaxDepot?: number
  modeReservation?: string
  ouvert?: boolean; datesFermeture?: string[]
}
interface Capacite {
  type: string; capaciteMax: number; articlesReserves: number
  placesRestantes: number; complet: boolean
}

const JOURS_ORDER = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const JOURS_LABELS: Record<string,string> = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' }
const JOURS_FULL: Record<string,string> = { lundi:'Lundi', mardi:'Mardi', mercredi:'Mercredi', jeudi:'Jeudi', vendredi:'Vendredi', samedi:'Samedi', dimanche:'Dimanche' }
const CONSIGNE_IDS = ['4h-casque','4h-blouson','4h-sac','8h-casque','8h-blouson','8h-sac']
const DEPOT_IDS    = ['depot-24h','depot-7j']

function getProchainsDates(horaires: Record<string, JourHoraire>, datesFermeture: string[]) {
  const dates: { date: string; label: string; jour: string }[] = []
  const today = new Date()
  const joursSemaine = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i)
    const jour = joursSemaine[d.getDay()]
    const dateStr = d.toISOString().split('T')[0]
    if (horaires[jour]?.ouvert && !datesFermeture.includes(dateStr)) {
      const label = i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain'
        : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
      dates.push({ date: dateStr, label, jour })
    }
  }
  return dates
}

function getCreneaux(horaire: JourHoraire, duree: number): string[] {
  if (!horaire?.ouvert) return []
  const [hO, mO] = horaire.ouverture.split(':').map(Number)
  const [hF, mF] = horaire.fermeture.split(':').map(Number)
  const debut = hO * 60 + mO; const fin = hF * 60 + mF
  const creneaux: string[] = []
  for (let t = debut; t + duree <= fin; t += 60) {
    const hh = Math.floor(t/60).toString().padStart(2,'0'); const mm = (t%60).toString().padStart(2,'0')
    const tf = t + duree; const hh2 = Math.floor(tf/60).toString().padStart(2,'0'); const mm2 = (tf%60).toString().padStart(2,'0')
    creneaux.push(`${hh}:${mm}-${hh2}:${mm2}`)
  }
  return creneaux
}

export default function HostPage() {
  const { hostId } = useParams<{ hostId: string }>()
  const router = useRouter()

  const [authChecked,  setAuthChecked]  = useState(false)
  const [isConnected,  setIsConnected]  = useState(false)
  const [host,         setHost]         = useState<Host | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [etape,        setEtape]        = useState<1|2|3>(1)

  const [selectedTarifs,  setSelectedTarifs]  = useState<Record<string, number>>({})
  const [selectedDate,    setSelectedDate]    = useState('')
  const [selectedJour,    setSelectedJour]    = useState('')
  const [selectedCreneau, setSelectedCreneau] = useState('')
  const [customerEmail,   setCustomerEmail]   = useState('')
  const [paying,    setPaying]    = useState(false)
  const [payError,  setPayError]  = useState('')

  const [capacites,   setCapacites]   = useState<Record<string, Capacite>>({})
  const [checkingCap, setCheckingCap] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setIsConnected(!!user)
      setAuthChecked(true)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    fetch(`/api/hosts/${hostId}`)
      .then(r => r.json())
      .then(d => { if (d.host) setHost(d.host); else setError('Hôte introuvable') })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [hostId])

  if (authChecked && !isConnected) {
    return (
      <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-[#F5C84A]/20 rounded-2xl flex items-center justify-center text-3xl mb-2">🔐</div>
        <h1 className="text-xl font-bold text-white">Connexion requise</h1>
        <p className="text-sm text-white/50 max-w-xs">Pour réserver un point de dépôt, vous devez avoir un compte VESTILIB.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          <Link href={`/user/login?redirect=/host/${hostId}`}
            className="w-full bg-[#F5C84A] text-[#1A3A6B] font-bold py-3.5 rounded-2xl text-center">
            Se connecter
          </Link>
          <Link href={`/user/register?redirect=/host/${hostId}`}
            className="w-full bg-white/10 border border-white/20 text-white font-semibold py-3.5 rounded-2xl text-center">
            Créer un compte
          </Link>
          <Link href="/map" className="text-sm text-white/40 mt-2">← Retour à la carte</Link>
        </div>
      </div>
    )
  }

  if (loading || !authChecked) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !host) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">{error || 'Hôte introuvable'}</p>
      <Link href="/map" className="text-[#1A3A6B] text-sm underline">Retour à la carte</Link>
    </div>
  )

  if (host.ouvert === false) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl mb-2">🔒</div>
      <h1 className="text-xl font-bold text-gray-900">Point de dépôt fermé</h1>
      <p className="text-sm text-gray-400">Cet hôte a temporairement fermé son offre VESTILIB.</p>
      <Link href="/map" className="bg-[#1A3A6B] text-[#F5C84A] font-semibold px-8 py-3 rounded-xl">
        Trouver un autre hôte
      </Link>
    </div>
  )

  const tarifsDisponibles = TARIFS_VESTILIB.filter(t => host.prestations?.includes(t.id))
  const nbConsigne = Object.entries(selectedTarifs).filter(([id]) => CONSIGNE_IDS.includes(id)).reduce((s,[,q]) => s+q, 0)
  const nbMoto     = selectedTarifs['parking-moto'] ?? 0
  const nbVelo     = selectedTarifs['parking-velo'] ?? 0
  const nbDepot    = Object.entries(selectedTarifs).filter(([id]) => DEPOT_IDS.includes(id)).reduce((s,[,q]) => s+q, 0)
  const hasDepot   = nbDepot > 0

  const calcTotal = () => {
    let sum = 0
    const nb4h = (['4h-casque','4h-blouson','4h-sac'] as string[]).reduce((s,id) => s+(selectedTarifs[id]??0), 0)
    const nb8h = (['8h-casque','8h-blouson','8h-sac'] as string[]).reduce((s,id) => s+(selectedTarifs[id]??0), 0)
    ;(['4h-casque','4h-blouson','4h-sac'] as string[]).forEach(id => { sum += (selectedTarifs[id]??0)*4 })
    if (nb4h >= 4) sum -= Math.floor(nb4h/4)*4
    ;(['8h-casque','8h-blouson','8h-sac'] as string[]).forEach(id => { sum += (selectedTarifs[id]??0)*6 })
    if (nb8h >= 4) sum -= Math.floor(nb8h/4)*6
    ;['douche','parking-moto','parking-velo','depot-24h','depot-7j'].forEach(id => {
      const t = TARIFS_VESTILIB.find(t => t.id === id)
      if (t && (selectedTarifs[id]??0) > 0) sum += t.prix * (selectedTarifs[id]??0)
    })
    return Math.max(sum, 0)
  }
  const total = calcTotal()
  const nb4h = (['4h-casque','4h-blouson','4h-sac'] as string[]).reduce((s,id) => s+(selectedTarifs[id]??0), 0)
  const nb8h = (['8h-casque','8h-blouson','8h-sac'] as string[]).reduce((s,id) => s+(selectedTarifs[id]??0), 0)
  const remiseTotal = (nb4h >= 4 ? Math.floor(nb4h/4)*4 : 0) + (nb8h >= 4 ? Math.floor(nb8h/4)*6 : 0)
  const nbArticles = Object.values(selectedTarifs).reduce((s,q) => s+q, 0)

  const consigneDepasse = !!host.capaciteMax && nbConsigne > host.capaciteMax
  const motoDepasse     = !!host.capaciteMaxMoto && nbMoto > host.capaciteMaxMoto
  const veloDepasse     = !!host.capaciteMaxVelo && nbVelo > host.capaciteMaxVelo
  const capaciteDepasse = consigneDepasse || motoDepasse || veloDepasse

  const toggleTarif = (id: string) => {
    setSelectedTarifs(prev => {
      if (prev[id]) { const n={...prev}; delete n[id]; return n }
      return { ...prev, [id]: 1 }
    })
  }
  const updateQty = (id: string, delta: number) => {
    setSelectedTarifs(prev => {
      const q = (prev[id]??0) + delta
      if (q <= 0) { const n={...prev}; delete n[id]; return n }
      return { ...prev, [id]: q }
    })
  }

  const dates = host.horaires ? getProchainsDates(host.horaires, host.datesFermeture ?? []) : []
  const duree = Object.keys(selectedTarifs).some(id => id.startsWith('8h')) ? 480
    : Object.keys(selectedTarifs).some(id => id.startsWith('4h')) ? 240 : 60
  const creneaux = selectedJour && host.horaires?.[selectedJour]
    ? getCreneaux(host.horaires[selectedJour], duree) : []

  const verifierCapacite = async (date: string, creneau: string) => {
    if (!host) return
    setCheckingCap(true)
    const base = `/api/check-capacity?hostId=${host.id}&date=${date}&creneau=${encodeURIComponent(creneau)}`
    try {
      const newCaps: Record<string, Capacite> = {}
      const checks = []
      if (nbConsigne > 0) checks.push({ type: 'consigne', nb: nbConsigne })
      if (nbMoto > 0)     checks.push({ type: 'moto',     nb: nbMoto })
      if (nbVelo > 0)     checks.push({ type: 'velo',     nb: nbVelo })
      for (const { type, nb } of checks) {
        const res  = await fetch(`${base}&type=${type}`)
        const data = await res.json()
        const restantes = data.capaciteMax - data.articlesReserves - nb
        newCaps[type] = { ...data, placesRestantes: Math.max(restantes, 0), complet: restantes < 0 }
      }
      setCapacites(newCaps)
    } catch { setCapacites({}) }
    finally { setCheckingCap(false) }
  }

  const isAnyComplet    = Object.values(capacites).some(c => c.complet)
  const alertMessage    = Object.values(capacites).filter(c => c.complet).map(c =>
    c.type === 'moto' ? 'parking moto complet' : c.type === 'velo' ? 'parking vélo complet' : 'consigne complète'
  ).join(', ')
  const warningMessages = Object.values(capacites).filter(c => !c.complet && c.placesRestantes <= 4).map(c =>
    `${c.placesRestantes} place(s) ${c.type === 'moto' ? 'moto' : c.type === 'velo' ? 'vélo' : 'consigne'}`
  ).join(', ')

  const aujourdHui = () => ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][new Date().getDay()]
  const statut = () => {
    const h = host.horaires?.[aujourdHui()]
    if (!h?.ouvert) return { ouvert: false, label: "Fermé aujourd'hui" }
    return { ouvert: true, label: `${h.ouverture} — ${h.fermeture}` }
  }
  const statutAff = statut()

  const description = Object.entries(selectedTarifs)
    .map(([id, qty]) => { const t = TARIFS_VESTILIB.find(t => t.id === id); return t ? `${qty}x ${t.label}` : '' })
    .filter(Boolean).join(', ')

  const hostEarns = Math.round(total * 0.7 * 100) / 100

  const payer = async () => {
    if (!customerEmail) { setPayError('Email requis.'); return }
    if (isAnyComplet)   { setPayError('Capacité dépassée pour ce créneau.'); return }
    setPaying(true); setPayError('')

    if (host.modeReservation === 'validation') {
      try {
        const res = await fetch('/api/request-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostId: host.id, customerEmail, date: selectedDate,
            creneau: selectedCreneau, description,
            prestations: Object.entries(selectedTarifs).map(([tarifId, quantite]) => ({ tarifId, quantite })),
            totalAmount: total, hostEarns,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setPayError(data.error ?? 'Erreur'); return }
        router.push(`/pay/pending?code=${data.bookingCode}&email=${encodeURIComponent(customerEmail)}`)
      } catch { setPayError('Erreur réseau.') }
      finally { setPaying(false) }
      return
    }

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: host.id, amountEuros: Math.max(total, 1),
          description: `VESTILIB — ${description}`, customerEmail,
          date: selectedDate, creneau: selectedCreneau,
          prestations: Object.entries(selectedTarifs).map(([tarifId, quantite]) => ({ tarifId, quantite })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setPayError(data.error ?? 'Erreur paiement'); return }
      window.location.href = data.url
    } catch { setPayError('Erreur réseau.') }
    finally { setPaying(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* Header */}
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <Link href="/map" className="text-white/50 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </Link>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">{host.prenom} {host.nom}</p>
          <p className="text-white/40 text-xs">{host.ville}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statutAff.ouvert ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {statutAff.ouvert ? '● Ouvert' : '○ Fermé'}
        </span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* Infos hôte */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {host.adresse}, {host.codePostal} {host.ville}
              </p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {statutAff.label}
              </p>
            </div>
            
          </div>
          <div className="grid grid-cols-7 gap-1">
            {JOURS_ORDER.map(jour => {
              const h = host.horaires?.[jour]
              return (
                <div key={jour} className={`text-center rounded-lg p-1.5 ${h?.ouvert ? 'bg-[#1A3A6B]/5' : 'bg-gray-50'}`}>
                  <p className="text-[9px] font-semibold text-gray-400 mb-0.5">{JOURS_LABELS[jour]}</p>
                  {h?.ouvert ? (
                    <><p className="text-[8px] text-[#1A3A6B] font-medium leading-tight">{h.ouverture}</p><p className="text-[8px] text-[#1A3A6B] leading-tight">{h.fermeture}</p></>
                  ) : <p className="text-[9px] text-gray-300 mt-1">—</p>}
                </div>
              )
            })}
          </div>
        </div>
      

        {/* Étapes */}
        <div className="flex gap-2 mb-5">
          {[{n:1,label:'Prestations'},{n:2,label:'Date & Heure'},{n:3,label:'Paiement'}].map(s => (
            <div key={s.n} className={`flex-1 text-center py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              etape === s.n ? 'bg-[#1A3A6B] text-[#F5C84A] border-[#1A3A6B] shadow-sm' :
              etape > s.n  ? 'bg-green-500 text-white border-green-500' :
              'bg-white text-gray-300 border-gray-100'
            }`}>
              {etape > s.n ? '✓' : s.n}. {s.label}
            </div>
          ))}
        </div>

        {/* ── ÉTAPE 1 : PRESTATIONS ── */}
        {etape === 1 && (
          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const tarifs = tarifsDisponibles.filter(t => t.categorie === cat)
              if (!tarifs.length) return null
              return (
                <div key={cat}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{cat}</p>
                  <div className="space-y-2">
                    {tarifs.map(tarif => {
                      const qty = selectedTarifs[tarif.id] ?? 0
                      const selected = qty > 0
                      return (
                        <div key={tarif.id}
                          onClick={() => !selected && toggleTarif(tarif.id)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                            selected
                              ? 'border-[#1A3A6B] bg-white shadow-sm'
                              : 'border-gray-100 bg-white hover:border-gray-200'
                          }`}>
                          {/* Checkbox visuel */}
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            selected ? 'bg-[#1A3A6B] border-[#1A3A6B]' : 'border-gray-300'
                          }`}
                            onClick={e => { e.stopPropagation(); toggleTarif(tarif.id) }}>
                            {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>

                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{tarif.label}</p>
                            <p className="text-xs text-gray-400 truncate">{tarif.description}</p>
                          </div>

                          {/* Prix + quantité */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {selected && (
                              <div className="flex items-center gap-2">
                                <button onClick={e => { e.stopPropagation(); updateQty(tarif.id, -1) }}
                                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-base flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all">
                                  −
                                </button>
                                <span className="text-sm font-bold text-[#1A3A6B] w-4 text-center">{qty}</span>
                                <button onClick={e => { e.stopPropagation(); updateQty(tarif.id, 1) }}
                                  className="w-7 h-7 rounded-full bg-[#1A3A6B] text-[#F5C84A] font-bold text-base flex items-center justify-center hover:bg-[#0C2447] active:scale-90 transition-all">
                                  +
                                </button>
                              </div>
                            )}
                            <span className={`text-base font-black min-w-[48px] text-right ${tarif.prix < 0 ? 'text-green-500' : 'text-[#1A3A6B]'}`}>
                              {tarif.prix < 0 ? `-${Math.abs(tarif.prix)}€` : `${tarif.prix}€`}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {REMISE_INFO[cat] && (
                    <div className="flex items-center gap-2 mt-2 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">
                      <span className="text-green-500">🎉</span>
                      <p className="text-xs text-green-700 font-medium">{REMISE_INFO[cat]}</p>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Alertes capacité */}
            {consigneDepasse && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-sm font-semibold text-red-600 text-center">Maximum {host.capaciteMax} articles consigne</p></div>}
            {motoDepasse     && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-sm font-semibold text-red-600 text-center">Maximum {host.capaciteMaxMoto} motos</p></div>}
            {veloDepasse     && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-sm font-semibold text-red-600 text-center">Maximum {host.capaciteMaxVelo} vélos</p></div>}

            {hasDepot && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-blue-800 mb-1">Dépôt longue durée</p>
                <p className="text-xs text-blue-600 mb-3">Les dépôts 24h et 7 jours nécessitent une validation de l'hôte.</p>
                <Link href="/messages" className="block w-full text-center bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl">
                  Contacter l'hôte
                </Link>
              </div>
            )}

            {/* Récap total */}
            {total > 0 && !hasDepot && (
              <div className="bg-[#1A3A6B] rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/60 text-xs">{nbArticles} article{nbArticles > 1 ? 's' : ''} sélectionné{nbArticles > 1 ? 's' : ''}</p>
                    {remiseTotal > 0 && <p className="text-green-400 text-xs font-medium">Remise −{remiseTotal.toFixed(2)}€ appliquée</p>}
                  </div>
                  <p className="text-[#F5C84A] font-black text-2xl">{total.toFixed(2)}€</p>
                </div>
              </div>
            )}

            {!hasDepot && (
              <button onClick={() => { if (total <= 0 || capaciteDepasse) return; setEtape(2) }}
                disabled={total <= 0 || capaciteDepasse}
                className="w-full bg-[#1A3A6B] text-[#F5C84A] font-bold py-4 rounded-2xl hover:bg-[#0C2447] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 text-sm shadow-lg shadow-[#1A3A6B]/20">
                Continuer — Choisir la date →
              </button>
              <Link href={`/messages?hostId=${host.id}`}
  className="flex items-center justify-center gap-1.5 text-[#1A3A6B]/50 text-xs py-2 hover:text-[#1A3A6B] transition-colors">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  Contacter l'hôte
</Link>
            )}
          </div>
        )}

        {/* ── ÉTAPE 2 : DATE & CRÉNEAU ── */}
        {etape === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-sm font-bold text-[#1A3A6B] mb-3">Choisissez la date</p>
              <div className="grid grid-cols-2 gap-2">
                {dates.map(d => (
                  <button key={d.date}
                    onClick={() => { setSelectedDate(d.date); setSelectedJour(d.jour); setSelectedCreneau(''); setCapacites({}) }}
                    className={`p-3.5 rounded-xl border text-left transition-all active:scale-95 ${
                      selectedDate === d.date
                        ? 'border-[#1A3A6B] bg-[#1A3A6B] shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                    }`}>
                    <p className={`text-sm font-bold ${selectedDate === d.date ? 'text-[#F5C84A]' : 'text-gray-800'}`}>{d.label}</p>
                    <p className={`text-xs mt-0.5 ${selectedDate === d.date ? 'text-white/60' : 'text-gray-400'}`}>{JOURS_FULL[d.jour]}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && creneaux.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-sm font-bold text-[#1A3A6B] mb-3">Choisissez un créneau</p>
                <div className="grid grid-cols-3 gap-2">
                  {creneaux.map(c => (
                    <button key={c}
                      onClick={() => { setSelectedCreneau(c); verifierCapacite(selectedDate, c) }}
                      className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                        selectedCreneau === c
                          ? 'border-[#1A3A6B] bg-[#1A3A6B] text-[#F5C84A]'
                          : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>

                {selectedCreneau && checkingCap && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">Vérification des disponibilités...</p>
                  </div>
                )}
                {selectedCreneau && !checkingCap && Object.keys(capacites).length > 0 && (
                  <div className={`mt-3 rounded-xl p-3 ${isAnyComplet ? 'bg-red-50 border border-red-200' : warningMessages ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                    {isAnyComplet ? (
                      <p className="text-sm font-semibold text-red-600 text-center">⚠️ {alertMessage}</p>
                    ) : warningMessages ? (
                      <p className="text-sm font-semibold text-orange-600 text-center">⚡ Reste {warningMessages} !</p>
                    ) : (
                      <p className="text-sm text-green-600 text-center">✓ Places disponibles</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setEtape(1)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
                ← Retour
              </button>
              <button onClick={() => { if (!selectedDate || !selectedCreneau || isAnyComplet) return; setEtape(3) }}
                disabled={!selectedDate || !selectedCreneau || isAnyComplet}
                className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-bold py-4 rounded-2xl hover:bg-[#0C2447] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-[#1A3A6B]/20">
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : PAIEMENT ── */}
        {etape === 3 && (
          <div className="space-y-4">
            {/* Récap commande */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-sm font-bold text-[#1A3A6B] mb-3">Récapitulatif</p>
              <div className="space-y-2 mb-3">
                {Object.entries(selectedTarifs).map(([id, qty]) => {
                  const t = TARIFS_VESTILIB.find(t => t.id === id)
                  if (!t) return null
                  return (
                    <div key={id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{qty}x {t.label}</span>
                      <span className="text-sm font-semibold text-gray-800">{(t.prix * qty).toFixed(2)}€</span>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Date
                  </span>
                  <span className="font-medium text-gray-600">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Créneau
                  </span>
                  <span className="font-medium text-gray-600">{selectedCreneau}</span>
                </div>
                {remiseTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Remise 4e article</span>
                    <span className="font-semibold text-green-600">−{remiseTotal.toFixed(2)}€</span>
                  </div>
                )}
              </div>

              <div className="bg-[#1A3A6B] rounded-xl p-3 mt-3 flex justify-between items-center">
                <span className="text-white/70 text-sm">Total à payer</span>
                <span className="text-[#F5C84A] font-black text-xl">{total.toFixed(2)}€</span>
              </div>
            </div>

            {/* Email */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Votre email de confirmation *</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                placeholder="vous@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
            </div>

            {/* Mode paiement */}
            {host.modeReservation !== 'validation' ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-4">
                <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">Paiement immédiat</p>
                  <p className="text-xs text-green-600">Réservation confirmée instantanément</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">Demande de réservation</p>
                  <p className="text-xs text-amber-600">L'hôte doit valider avant le paiement</p>
                </div>
              </div>
            )}

            {payError && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{payError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setEtape(2)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
                ← Retour
              </button>
              <button onClick={payer} disabled={paying || !customerEmail}
                className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-black py-4 rounded-2xl hover:bg-[#0C2447] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-[#1A3A6B]/20 text-sm">
                {paying ? '⏳ Chargement...' : host.modeReservation === 'validation' ? 'Envoyer la demande' : `Payer ${total.toFixed(2)}€`}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 py-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <p className="text-xs text-gray-400">Paiement sécurisé · Stripe · PCI-DSS</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}