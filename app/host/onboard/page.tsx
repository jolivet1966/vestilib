'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { TARIFS_VESTILIB, CATEGORIES } from '@/lib/tarifs'
import type { Horaires, JourHoraire } from '@/types'

declare global { interface Window { google: any } }

const JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'] as const
const JOURS_LABELS: Record<string, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
}

const horairesDefaut: Horaires = Object.fromEntries(
  JOURS.map(j => [j, { ouvert: j !== 'dimanche', ouverture: '09:00', fermeture: '19:00' }])
) as Horaires

export default function OnboardHostPage() {
  const router = useRouter()
  const [etape, setEtape] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState('')

  const [existingUid, setExistingUid] = useState<string | null>(null)
  const [dejaConnecte, setDejaConnecte] = useState(false)
  const [typeCompte, setTypeCompte] = useState<'individual' | 'company'>('individual')

  const [prenom,     setPrenom]     = useState('')
  const [nom,        setNom]        = useState('')
  const [email,      setEmail]      = useState('')
  const [telephone,  setTelephone]  = useState('')
  const [adresse,    setAdresse]    = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville,      setVille]      = useState('')
  const [password,   setPassword]   = useState('')
  const [password2,  setPassword2]  = useState('')

  const adresseRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  const [horaires, setHoraires] = useState<Horaires>(horairesDefaut)

  const [prestations,      setPrestations]      = useState<string[]>([])
  const [capaciteMax,      setCapaciteMax]      = useState<number>(20)
  const [capaciteMaxMoto,  setCapaciteMaxMoto]  = useState<number>(5)
  const [capaciteMaxVelo,  setCapaciteMaxVelo]  = useState<number>(5)
  const [capaciteMaxDepot, setCapaciteMaxDepot] = useState<number>(10)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        setExistingUid(firebaseUser.uid)
        setDejaConnecte(true)
        setEmail(firebaseUser.email ?? '')
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setPrenom(data.prenom ?? '')
            setNom(data.nom ?? '')
            setTelephone(data.telephone ?? '')
          }
        } catch { }
      }
      setCheckingAuth(false)
    })
    return () => unsub()
  }, [])

  // Charger Google Maps et initialiser autocomplete
  useEffect(() => {
    if (etape !== 1) return
    const initAutocomplete = () => {
      if (!adresseRef.current || !window.google?.maps?.places) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(adresseRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'fr' },
        fields: ['address_components', 'formatted_address'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        if (!place?.address_components) return
        let rue = ''; let numero = ''; let cp = ''; let vil = ''
        for (const comp of place.address_components) {
          if (comp.types.includes('street_number')) numero = comp.long_name
          if (comp.types.includes('route')) rue = comp.long_name
          if (comp.types.includes('postal_code')) cp = comp.long_name
          if (comp.types.includes('locality')) vil = comp.long_name
        }
        setAdresse(`${numero} ${rue}`.trim())
        setCodePostal(cp)
        setVille(vil)
      })
    }

    if (window.google?.maps?.places) {
      initAutocomplete()
    } else {
      const existing = document.querySelector('script[data-gmaps]')
      if (!existing) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
        script.async = true
        script.dataset.gmaps = 'true'
        script.onload = initAutocomplete
        document.head.appendChild(script)
      } else {
        existing.addEventListener('load', initAutocomplete)
      }
    }
  }, [etape])

  const togglePrestation = (id: string) => {
    setPrestations(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const updateHoraire = (jour: string, field: keyof JourHoraire, value: string | boolean) => {
    setHoraires(prev => ({
      ...prev,
      [jour]: { ...prev[jour as keyof Horaires], [field]: value },
    }))
  }

  const validerEtape1 = () => {
    if (!prenom || !nom || !email || !telephone || !adresse || !codePostal || !ville) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalide.')
      return
    }
    if (!dejaConnecte) {
      if (!password || password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caracteres.')
        return
      }
      if (password !== password2) {
        setError('Les mots de passe ne correspondent pas.')
        return
      }
    }
    setError('')
    setEtape(2)
  }

  const validerEtape2 = () => {
    const jourOuvert = JOURS.some(j => horaires[j].ouvert)
    if (!jourOuvert) {
      setError("Selectionnez au moins un jour d ouverture.")
      return
    }
    setError('')
    setEtape(3)
  }

  const soumettre = async () => {
    if (prestations.length === 0) {
      setError('Selectionnez au moins une prestation.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/onboard-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, prenom, nom, telephone,
          adresse, codePostal, ville,
          horaires, prestations,
          capaciteMax, capaciteMaxMoto, capaciteMaxVelo, capaciteMaxDepot,
          existingUid: existingUid ?? undefined,
          typeCompte,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur serveur.'); return }
      window.location.href = data.onboardingUrl
    } catch {
      setError('Erreur reseau. Verifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A6B] tracking-widest mb-1">VESTILIB</h1>
          <p className="text-sm text-gray-400">Inscription hote</p>
          {dejaConnecte && (
            <p className="text-xs text-green-600 bg-green-50 rounded-full px-3 py-1 inline-block mt-2">
              Connecte en tant que {email}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${
                etape > n ? 'bg-green-500 text-white' :
                etape === n ? 'bg-[#1A3A6B] text-[#F5C84A]' :
                'bg-gray-200 text-gray-400'
              }`}>
                {etape > n ? 'ok' : n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${etape === n ? 'text-[#1A3A6B]' : 'text-gray-400'}`}>
                {n === 1 ? 'Identite' : n === 2 ? 'Horaires' : 'Prestations'}
              </span>
              {n < 3 && <div className={`flex-1 h-0.5 ${etape > n ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {etape === 1 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-5">Vos informations</h2>
              <div className="space-y-4">

                <div className="mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Vous etes</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTypeCompte('individual')}
                      className={`p-3 rounded-xl border text-left transition-colors ${typeCompte === 'individual' ? 'border-[#1A3A6B] bg-[#1A3A6B]/5' : 'border-gray-100'}`}>
                      <p className="text-sm font-semibold text-gray-800">Particulier</p>
                      <p className="text-xs text-gray-400">Personne physique</p>
                    </button>
                    <button type="button" onClick={() => setTypeCompte('company')}
                      className={`p-3 rounded-xl border text-left transition-colors ${typeCompte === 'company' ? 'border-[#1A3A6B] bg-[#1A3A6B]/5' : 'border-gray-100'}`}>
                      <p className="text-sm font-semibold text-gray-800">Entreprise</p>
                      <p className="text-xs text-gray-400">Personne morale</p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prenom" value={prenom} onChange={setPrenom} placeholder="Jean" />
                  <Field label="Nom" value={nom} onChange={setNom} placeholder="Dupont" />
                </div>

                {dejaConnecte ? (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Email</label>
                    <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500">
                      {email}
                    </div>
                  </div>
                ) : (
                  <Field label="Email" value={email} onChange={setEmail} placeholder="jean@email.com" type="email" />
                )}

                <Field label="Telephone" value={telephone} onChange={setTelephone} placeholder="06 12 34 56 78" type="tel" />

                {!dejaConnecte && (
                  <>
                    <Field label="Mot de passe" value={password} onChange={setPassword} placeholder="Minimum 6 caracteres" type="password" />
                    <Field label="Confirmer mot de passe" value={password2} onChange={setPassword2} placeholder="Repetez le mot de passe" type="password" />
                  </>
                )}

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Adresse (saisir pour autocompletion)</label>
                  <input
                    ref={adresseRef}
                    type="text"
                    value={adresse}
                    onChange={e => setAdresse(e.target.value)}
                    placeholder="12 rue de la Paix, Montpellier..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Code postal</label>
                    <input type="text" value={codePostal} onChange={e => setCodePostal(e.target.value)}
                      placeholder="34000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Ville</label>
                    <input type="text" value={ville} onChange={e => setVille(e.target.value)}
                      placeholder="Montpellier"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
                  </div>
                </div>

              </div>
              {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={validerEtape1} className="mt-6 w-full bg-[#1A3A6B] text-[#F5C84A] font-medium py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
                Continuer
              </button>
            </div>
          )}

          {etape === 2 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-5">Horaires d ouverture</h2>
              <div className="space-y-3">
                {JOURS.map(jour => (
                  <div key={jour} className="flex items-center gap-3">
                    <div className="w-24 flex items-center gap-2">
                      <input type="checkbox" checked={horaires[jour].ouvert}
                        onChange={e => updateHoraire(jour, 'ouvert', e.target.checked)}
                        className="w-4 h-4 accent-[#1A3A6B]" />
                      <span className="text-sm text-gray-700 font-medium">{JOURS_LABELS[jour]}</span>
                    </div>
                    {horaires[jour].ouvert ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={horaires[jour].ouverture}
                          onChange={e => updateHoraire(jour, 'ouverture', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A3A6B]" />
                        <span className="text-gray-400 text-xs">-</span>
                        <input type="time" value={horaires[jour].fermeture}
                          onChange={e => updateHoraire(jour, 'fermeture', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A3A6B]" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Ferme</span>
                    )}
                  </div>
                ))}
              </div>
              {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="mt-6 flex gap-3">
                <button onClick={() => setEtape(1)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  Retour
                </button>
                <button onClick={validerEtape2} className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-medium py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
                  Continuer
                </button>
              </div>
            </div>
          )}

          {etape === 3 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Vos prestations</h2>
              <p className="text-xs text-gray-400 mb-5">Selectionnez les services que vous proposez.</p>
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

              {prestations.length > 0 && (
                <div className="mt-4 bg-[#1A3A6B]/5 rounded-xl p-3">
                  <p className="text-xs text-[#1A3A6B] font-medium">
                    {prestations.length} prestation{prestations.length > 1 ? 's' : ''} selectionnee{prestations.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="mt-5 border-t border-gray-100 pt-5 space-y-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Capacites maximales par creneau
                </label>
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

              {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="mt-6 flex gap-3">
                <button onClick={() => setEtape(2)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  Retour
                </button>
                <button onClick={soumettre} disabled={loading}
                  className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-medium py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading ? 'Creation...' : 'Creer mon compte'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Apres validation, vous serez redirige vers Stripe pour configurer vos virements.
        </p>
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

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  const [showPwd, setShowPwd] = useState(false)
  const inputType = type === 'password' ? (showPwd ? 'text' : 'password') : type
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <div className="relative">
        <input type={inputType} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors pr-10" />
        {type === 'password' && (
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
            {showPwd ? 'Masquer' : 'Afficher'}
          </button>
        )}
      </div>
    </div>
  )
}