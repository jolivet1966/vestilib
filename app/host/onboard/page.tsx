'use client'
// app/host/onboard/page.tsx
// Formulaire d'inscription hôte en 3 étapes
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TARIFS_VESTILIB, CATEGORIES } from '@/lib/tarifs'
import type { Horaires, JourHoraire } from '@/types'

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
  const [error, setError] = useState('')

  // Étape 1 — Identité
  const [prenom,     setPrenom]     = useState('')
  const [nom,        setNom]        = useState('')
  const [email,      setEmail]      = useState('')
  const [telephone,  setTelephone]  = useState('')
  const [adresse,    setAdresse]    = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville,      setVille]      = useState('')

  // Étape 2 — Horaires
  const [horaires, setHoraires] = useState<Horaires>(horairesDefaut)

  // Étape 3 — Prestations
  const [prestations, setPrestations] = useState<string[]>([])

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
    setError('')
    setEtape(2)
  }

  const validerEtape2 = () => {
    const jourOuvert = JOURS.some(j => horaires[j].ouvert)
    if (!jourOuvert) {
      setError('Sélectionnez au moins un jour d\'ouverture.')
      return
    }
    setError('')
    setEtape(3)
  }

  const soumettre = async () => {
    if (prestations.length === 0) {
      setError('Sélectionnez au moins une prestation.')
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
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur serveur.'); return }

      // Redirection vers Stripe
      window.location.href = data.onboardingUrl

    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A6B] tracking-widest mb-1">VESTILIB</h1>
          <p className="text-sm text-gray-400">Inscription hôte</p>
        </div>

        {/* Barre de progression */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${
                etape > n ? 'bg-green-500 text-white' :
                etape === n ? 'bg-[#1A3A6B] text-[#F5C84A]' :
                'bg-gray-200 text-gray-400'
              }`}>
                {etape > n ? '✓' : n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${etape === n ? 'text-[#1A3A6B]' : 'text-gray-400'}`}>
                {n === 1 ? 'Identité' : n === 2 ? 'Horaires' : 'Prestations'}
              </span>
              {n < 3 && <div className={`flex-1 h-0.5 ${etape > n ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* ── ÉTAPE 1 : Identité ── */}
          {etape === 1 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-5">Vos informations</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom *"    value={prenom}    onChange={setPrenom}    placeholder="Jean" />
                  <Field label="Nom *"       value={nom}       onChange={setNom}       placeholder="Dupont" />
                </div>
                <Field label="Email *"       value={email}     onChange={setEmail}     placeholder="jean@email.com" type="email" />
                <Field label="Téléphone *"   value={telephone} onChange={setTelephone} placeholder="06 12 34 56 78" type="tel" />
                <Field label="Adresse *"     value={adresse}   onChange={setAdresse}   placeholder="12 rue de la Paix" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Code postal *" value={codePostal} onChange={setCodePostal} placeholder="34000" />
                  <Field label="Ville *"        value={ville}      onChange={setVille}      placeholder="Montpellier" />
                </div>
              </div>
              {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={validerEtape1} className="mt-6 w-full bg-[#1A3A6B] text-[#F5C84A] font-medium py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
                Continuer →
              </button>
            </div>
          )}

          {/* ── ÉTAPE 2 : Horaires ── */}
          {etape === 2 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-5">Horaires d'ouverture</h2>
              <div className="space-y-3">
                {JOURS.map(jour => (
                  <div key={jour} className="flex items-center gap-3">
                    <div className="w-24 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={horaires[jour].ouvert}
                        onChange={e => updateHoraire(jour, 'ouvert', e.target.checked)}
                        className="w-4 h-4 accent-[#1A3A6B]"
                      />
                      <span className="text-sm text-gray-700 font-medium">{JOURS_LABELS[jour]}</span>
                    </div>
                    {horaires[jour].ouvert ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={horaires[jour].ouverture}
                          onChange={e => updateHoraire(jour, 'ouverture', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A3A6B]"
                        />
                        <span className="text-gray-400 text-xs">→</span>
                        <input
                          type="time"
                          value={horaires[jour].fermeture}
                          onChange={e => updateHoraire(jour, 'fermeture', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#1A3A6B]"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Fermé</span>
                    )}
                  </div>
                ))}
              </div>
              {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="mt-6 flex gap-3">
                <button onClick={() => setEtape(1)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  ← Retour
                </button>
                <button onClick={validerEtape2} className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-medium py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
                  Continuer →
                </button>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 : Prestations ── */}
          {etape === 3 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Vos prestations</h2>
              <p className="text-xs text-gray-400 mb-5">Sélectionnez les services que vous proposez.</p>

              <div className="space-y-5">
                {CATEGORIES.map(cat => {
                  const tarifs = TARIFS_VESTILIB.filter(t => t.categorie === cat)
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cat}</p>
                      <div className="space-y-2">
                        {tarifs.map(tarif => (
                          <label key={tarif.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                            prestations.includes(tarif.id)
                              ? 'border-[#1A3A6B] bg-[#1A3A6B]/5'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={prestations.includes(tarif.id)}
                                onChange={() => togglePrestation(tarif.id)}
                                className="w-4 h-4 accent-[#1A3A6B]"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{tarif.label}</p>
                                <p className="text-xs text-gray-400">{tarif.description}</p>
                              </div>
                            </div>
                            <span className={`text-sm font-semibold ${tarif.prix < 0 ? 'text-green-600' : 'text-[#1A3A6B]'}`}>
                              {tarif.prix < 0 ? `−${Math.abs(tarif.prix)}€` : `${tarif.prix}€`}
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
                  <p className="text-xs text-[#1A3A6B] font-medium">{prestations.length} prestation{prestations.length > 1 ? 's' : ''} sélectionnée{prestations.length > 1 ? 's' : ''}</p>
                </div>
              )}

              {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="mt-6 flex gap-3">
                <button onClick={() => setEtape(2)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  ← Retour
                </button>
                <button
                  onClick={soumettre}
                  disabled={loading}
                  className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-medium py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Création...' : 'Créer mon compte →'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Après validation, vous serez redirigé vers Stripe pour configurer vos virements.
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors"
      />
    </div>
  )
}