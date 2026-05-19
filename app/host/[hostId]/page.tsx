'use client'
// app/host/[hostId]/page.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TARIFS_VESTILIB, CATEGORIES, REMISE_INFO } from '@/lib/tarifs'

interface JourHoraire { ouvert: boolean; ouverture: string; fermeture: string }
interface Host {
  id: string; prenom: string; nom: string; email: string; telephone: string
  adresse: string; codePostal: string; ville: string
  horaires: Record<string, JourHoraire>
  prestations: string[]
  capaciteMax?:      number
  capaciteMaxMoto?:  number
  capaciteMaxVelo?:  number
  capaciteMaxDepot?: number
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

function getProchainsDates(horaires: Record<string, JourHoraire>) {
  const dates: { date: string; label: string; jour: string }[] = []
  const today = new Date()
  const joursSemaine = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i)
    const jour = joursSemaine[d.getDay()]
    if (horaires[jour]?.ouvert) {
      const dateStr = d.toISOString().split('T')[0]
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
    creneaux.push(`${hh}:${mm}–${hh2}:${mm2}`)
  }
  return creneaux
}

export default function HostPage() {
  const { hostId } = useParams<{ hostId: string }>()

  const [host,    setHost]    = useState<Host | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [etape,   setEtape]   = useState<1|2|3>(1)

  const [selectedTarifs,  setSelectedTarifs]  = useState<Record<string, number>>({})
  const [selectedDate,    setSelectedDate]    = useState('')
  const [selectedJour,    setSelectedJour]    = useState('')
  const [selectedCreneau, setSelectedCreneau] = useState('')
  const [customerEmail,   setCustomerEmail]   = useState('')
  const [paying,          setPaying]          = useState(false)
  const [payError,        setPayError]        = useState('')

  const [capacites,    setCapacites]    = useState<Record<string, Capacite>>({})
  const [checkingCap,  setCheckingCap]  = useState(false)

  useEffect(() => {
    fetch(`/api/hosts/${hostId}`)
      .then(r => r.json())
      .then(d => { if (d.host) setHost(d.host); else setError('Hôte introuvable') })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [hostId])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !host) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">{error || 'Hôte introuvable'}</p>
      <Link href="/map" className="text-[#1A3A6B] text-sm underline">← Retour à la carte</Link>
    </div>
  )

  const tarifsDisponibles = TARIFS_VESTILIB.filter(t => host.prestations?.includes(t.id))

  // Comptes par type
  const nbConsigne = Object.entries(selectedTarifs).filter(([id]) => CONSIGNE_IDS.includes(id)).reduce((s,[,q]) => s+q, 0)
  const nbMoto     = selectedTarifs['parking-moto'] ?? 0
  const nbVelo     = selectedTarifs['parking-velo'] ?? 0
  const nbDepot    = Object.entries(selectedTarifs).filter(([id]) => DEPOT_IDS.includes(id)).reduce((s,[,q]) => s+q, 0)
  const hasDepot   = nbDepot > 0

  // Calcul total avec remise
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
  const nbArticles = Object.values(selectedTarifs).reduce((s,q) => s+q, 0)
  const nb4h = (['4h-casque','4h-blouson','4h-sac'] as string[]).reduce((s,id) => s+(selectedTarifs[id]??0), 0)
  const nb8h = (['8h-casque','8h-blouson','8h-sac'] as string[]).reduce((s,id) => s+(selectedTarifs[id]??0), 0)
  const remiseTotal = (nb4h >= 4 ? Math.floor(nb4h/4)*4 : 0) + (nb8h >= 4 ? Math.floor(nb8h/4)*6 : 0)

  // Capacité max dépassée étape 1
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

  const dates = host.horaires ? getProchainsDates(host.horaires) : []
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
    } catch {
      setCapacites({})
    } finally {
      setCheckingCap(false)
    }
  }

  const isAnyComplet    = Object.values(capacites).some(c => c.complet)
  const alertMessage    = Object.values(capacites).filter(c => c.complet).map(c =>
    c.type === 'moto' ? 'parking moto complet' : c.type === 'velo' ? 'parking vélo complet' : 'consigne complète'
  ).join(', ')
  const warningMessages = Object.values(capacites).filter(c => !c.complet && c.placesRestantes <= 4).map(c =>
    `${c.placesRestantes} place(s) ${c.type === 'moto' ? 'moto' : c.type === 'velo' ? 'vélo' : 'consigne'}`
  ).join(', ')

  const aujourdHui = () => ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][new Date().getDay()]
  const statutOuverture = () => {
    const h = host.horaires?.[aujourdHui()]
    if (!h?.ouvert) return { ouvert: false, label: "Fermé aujourd'hui" }
    return { ouvert: true, label: `Ouvert · ${h.ouverture} – ${h.fermeture}` }
  }
  const statut = statutOuverture()

  const payer = async () => {
    if (!customerEmail) { setPayError('Email requis.'); return }
    if (isAnyComplet)   { setPayError('Capacité dépassée pour ce créneau.'); return }
    setPaying(true); setPayError('')
    const description = Object.entries(selectedTarifs)
      .map(([id, qty]) => { const t = TARIFS_VESTILIB.find(t => t.id === id); return t ? `${qty}x ${t.label}` : '' })
      .filter(Boolean).join(', ')
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center gap-3">
        <Link href="/map" className="text-[#F5C84A]/70 hover:text-[#F5C84A] text-sm">← Carte</Link>
        <span className="text-white/30">|</span>
        <span className="text-[#F5C84A] font-bold tracking-widest">VESTILIB</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Infos hôte */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{host.prenom} {host.nom}</h1>
              <p className="text-sm text-gray-400">📍 {host.adresse}, {host.codePostal} {host.ville}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${statut.ouvert ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
              {statut.ouvert ? 'Ouvert' : 'Fermé'}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {JOURS_ORDER.map(jour => {
              const h = host.horaires?.[jour]
              return (
                <div key={jour} className={`text-center rounded-lg p-1.5 ${h?.ouvert ? 'bg-[#1A3A6B]/5' : 'bg-gray-50'}`}>
                  <p className="text-[10px] font-medium text-gray-500">{JOURS_LABELS[jour]}</p>
                  {h?.ouvert ? (
                    <><p className="text-[9px] text-[#1A3A6B] font-medium">{h.ouverture}</p><p className="text-[9px] text-[#1A3A6B]">{h.fermeture}</p></>
                  ) : <p className="text-[9px] text-gray-300">—</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Étapes */}
        <div className="flex gap-2 mb-6">
          {[{n:1,label:'Prestations'},{n:2,label:'Date & Heure'},{n:3,label:'Paiement'}].map(s => (
            <div key={s.n} className={`flex-1 text-center py-2 rounded-xl text-xs font-medium border transition-colors ${
              etape === s.n ? 'bg-[#1A3A6B] text-[#F5C84A] border-[#1A3A6B]' :
              etape > s.n  ? 'bg-green-500 text-white border-green-500' :
              'bg-white text-gray-400 border-gray-100'
            }`}>{etape > s.n ? '✓' : s.n}. {s.label}</div>
          ))}
        </div>

        {/* ── ÉTAPE 1 : Prestations ── */}
        {etape === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Choisissez vos prestations</h2>
            {CATEGORIES.map(cat => {
              const tarifs = tarifsDisponibles.filter(t => t.categorie === cat)
              if (!tarifs.length) return null
              return (
                <div key={cat} className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
                  <div className="space-y-2">
                    {tarifs.map(tarif => {
                      const qty = selectedTarifs[tarif.id] ?? 0
                      const selected = qty > 0
                      return (
                        <div key={tarif.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${selected ? 'border-[#1A3A6B] bg-[#1A3A6B]/5' : 'border-gray-100'}`}>
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selected} onChange={() => toggleTarif(tarif.id)} className="w-4 h-4 accent-[#1A3A6B]" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{tarif.label}</p>
                              <p className="text-xs text-gray-400">{tarif.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selected && (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => updateQty(tarif.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm flex items-center justify-center hover:bg-gray-200">−</button>
                                <span className="text-sm font-medium w-4 text-center">{qty}</span>
                                <button onClick={() => updateQty(tarif.id, 1)} className="w-6 h-6 rounded-full bg-[#1A3A6B] text-[#F5C84A] text-sm flex items-center justify-center hover:bg-[#0C2447]">+</button>
                              </div>
                            )}
                            <span className={`text-sm font-semibold ml-2 ${tarif.prix < 0 ? 'text-green-600' : 'text-[#1A3A6B]'}`}>
                              {tarif.prix < 0 ? `−${Math.abs(tarif.prix)}€` : `${tarif.prix}€`}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {REMISE_INFO[cat] && (
                    <p className="text-xs text-green-600 mt-2 bg-green-50 px-3 py-1.5 rounded-lg">{REMISE_INFO[cat]}</p>
                  )}
                </div>
              )
            })}

            {/* Alertes capacité étape 1 */}
            {consigneDepasse && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                <p className="text-sm font-semibold text-red-600 text-center">🚫 Maximum {host.capaciteMax} articles consigne — retirez {nbConsigne - (host.capaciteMax??0)}</p>
              </div>
            )}
            {motoDepasse && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                <p className="text-sm font-semibold text-red-600 text-center">🚫 Maximum {host.capaciteMaxMoto} motos — retirez {nbMoto - (host.capaciteMaxMoto??0)}</p>
              </div>
            )}
            {veloDepasse && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                <p className="text-sm font-semibold text-red-600 text-center">🚫 Maximum {host.capaciteMaxVelo} vélos — retirez {nbVelo - (host.capaciteMaxVelo??0)}</p>
              </div>
            )}

            {/* Dépôt longue durée */}
            {hasDepot && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">📦 Dépôt longue durée</p>
                <p className="text-xs text-blue-600 mb-3">Les dépôts 24h et 7 jours nécessitent une validation de l'hôte.</p>
                <Link href="/messages" className="block w-full text-center bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                  Contacter l'hôte →
                </Link>
              </div>
            )}

            {total > 0 && !hasDepot && (
              <div className="bg-[#1A3A6B]/5 rounded-xl p-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{nbArticles} article{nbArticles > 1 ? 's' : ''}</span>
                  <span className="text-lg font-bold text-[#1A3A6B]">{total.toFixed(2)}€</span>
                </div>
                {remiseTotal > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-green-600">🎉 Remise 4e article appliquée</span>
                    <span className="text-xs font-semibold text-green-600">−{remiseTotal.toFixed(2)}€</span>
                  </div>
                )}
              </div>
            )}

            {!hasDepot && (
              <button
                onClick={() => { if (total <= 0 || capaciteDepasse) return; setEtape(2) }}
                disabled={total <= 0 || capaciteDepasse}
                className="w-full bg-[#1A3A6B] text-[#F5C84A] font-medium py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continuer → Choisir la date
              </button>
            )}
          </div>
        )}

        {/* ── ÉTAPE 2 : Date & Créneau ── */}
        {etape === 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Choisissez la date</h2>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {dates.map(d => (
                <button key={d.date} onClick={() => { setSelectedDate(d.date); setSelectedJour(d.jour); setSelectedCreneau(''); setCapacites({}) }}
                  className={`p-3 rounded-xl border text-left transition-colors ${selectedDate === d.date ? 'border-[#1A3A6B] bg-[#1A3A6B]/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <p className="text-sm font-medium text-gray-800">{d.label}</p>
                  <p className="text-xs text-gray-400">{JOURS_FULL[d.jour]}</p>
                </button>
              ))}
            </div>

            {selectedDate && creneaux.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Choisissez un créneau</h2>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {creneaux.map(c => (
                    <button key={c} onClick={() => { setSelectedCreneau(c); verifierCapacite(selectedDate, c) }}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${selectedCreneau === c ? 'border-[#1A3A6B] bg-[#1A3A6B] text-[#F5C84A]' : 'border-gray-100 hover:border-gray-200 text-gray-700'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Alerte capacité créneau */}
            {selectedCreneau && checkingCap && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-center">
                <p className="text-xs text-gray-400">Vérification des disponibilités...</p>
              </div>
            )}
            {selectedCreneau && !checkingCap && Object.keys(capacites).length > 0 && (
              <div className={`rounded-xl p-3 mb-4 ${isAnyComplet ? 'bg-red-50 border border-red-200' : warningMessages ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                {isAnyComplet ? (
                  <p className="text-sm font-semibold text-red-600 text-center">🚫 {alertMessage}</p>
                ) : warningMessages ? (
                  <p className="text-sm font-semibold text-orange-600 text-center">⚠️ Reste {warningMessages} !</p>
                ) : (
                  <p className="text-sm text-green-600 text-center">✓ Places disponibles</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setEtape(1)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">← Retour</button>
              <button onClick={() => { if (!selectedDate || !selectedCreneau || isAnyComplet) return; setEtape(3) }}
                disabled={!selectedDate || !selectedCreneau || isAnyComplet}
                className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-medium py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Continuer → Paiement
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Récap + Paiement ── */}
        {etape === 3 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Récapitulatif</h2>
            <div className="space-y-2 mb-4">
              {Object.entries(selectedTarifs).map(([id, qty]) => {
                const t = TARIFS_VESTILIB.find(t => t.id === id)
                if (!t) return null
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{qty}x {t.label}</span>
                    <span className="font-medium text-gray-800">{(t.prix * qty).toFixed(2)}€</span>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-gray-100 pt-3 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-800">{new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-500">Créneau</span>
                <span className="font-medium text-gray-800">{selectedCreneau}</span>
              </div>
              {remiseTotal > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-600">Remise 4e article</span>
                  <span className="font-medium text-green-600">−{remiseTotal.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-[#1A3A6B]">{total.toFixed(2)}€</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Votre email (confirmation) *</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="vous@email.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
            </div>
            {payError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{payError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setEtape(2)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">← Retour</button>
              <button onClick={payer} disabled={paying}
                className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
                {paying ? 'Redirection...' : `Payer ${total.toFixed(2)}€`}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">Paiement sécurisé · Stripe · PCI-DSS</p>
          </div>
        )}
      </div>
    </div>
  )
}