'use client'
// app/messages/page.tsx
// Page messagerie — contact utilisateur vers hôte
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Host {
  id: string; prenom: string; nom: string; ville: string; adresse: string
}

const SUJETS = [
  'Demande de dépôt 24h',
  'Demande de dépôt 7 jours',
  'Question sur les horaires',
  'Question sur les prestations',
  'Autre demande',
]

function MessagesContent() {
  const params = useSearchParams()
  const hostIdParam = params.get('hostId')

  const [hosts,       setHosts]       = useState<Host[]>([])
  const [selectedHostId, setSelectedHostId] = useState(hostIdParam ?? '')
  const [fromNom,     setFromNom]     = useState('')
  const [fromEmail,   setFromEmail]   = useState('')
  const [sujet,       setSujet]       = useState(SUJETS[0])
  const [message,     setMessage]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [sent,        setSent]        = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    fetch('/api/hosts')
      .then(r => r.json())
      .then(d => setHosts(d.hosts ?? []))
      .catch(console.error)
  }, [])

  const selectedHost = hosts.find(h => h.id === selectedHostId)

  const envoyer = async () => {
    if (!selectedHostId || !fromNom || !fromEmail || !message) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      setError('Email invalide.')
      return
    }
    setSending(true); setError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: selectedHostId, fromEmail, fromNom, sujet, message }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur envoi'); return }
      setSent(true)
    } catch { setError('Erreur réseau.') }
    finally { setSending(false) }
  }

  if (sent) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mb-6">✓</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Message envoyé !</h1>
      <p className="text-sm text-gray-400 mb-2">
        {selectedHost ? `Votre message à ${selectedHost.prenom} ${selectedHost.nom} a bien été transmis.` : 'Votre message a bien été transmis.'}
      </p>
      <p className="text-sm text-gray-400 mb-8">L'hôte vous répondra directement par email.</p>
      <Link href="/map" className="bg-[#1A3A6B] text-[#F5C84A] font-semibold px-8 py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
        Retour à la carte
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-[#F5C84A]/70 hover:text-[#F5C84A] text-sm">← Accueil</Link>
        <span className="text-white/30">|</span>
        <span className="text-[#F5C84A] font-bold tracking-widest">Messages</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Contacter un hôte</h2>

          <div className="space-y-4">

            {/* Sélection hôte */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Hôte *</label>
              <select
                value={selectedHostId}
                onChange={e => setSelectedHostId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors bg-white"
              >
                <option value="">Sélectionnez un hôte</option>
                {hosts.map(h => (
                  <option key={h.id} value={h.id}>{h.prenom} {h.nom} — {h.ville}</option>
                ))}
              </select>
            </div>

            {/* Infos hôte sélectionné */}
            {selectedHost && (
              <div className="bg-[#1A3A6B]/5 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#1A3A6B] rounded-full flex items-center justify-center text-[#F5C84A] text-xs font-bold">
                  {selectedHost.prenom[0]}{selectedHost.nom[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{selectedHost.prenom} {selectedHost.nom}</p>
                  <p className="text-xs text-gray-400">📍 {selectedHost.adresse}, {selectedHost.ville}</p>
                </div>
              </div>
            )}

            {/* Votre nom */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Votre nom *</label>
              <input type="text" value={fromNom} onChange={e => setFromNom(e.target.value)}
                placeholder="Jean Dupont"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
            </div>

            {/* Votre email */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Votre email *</label>
              <input type="email" value={fromEmail} onChange={e => setFromEmail(e.target.value)}
                placeholder="vous@email.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
            </div>

            {/* Sujet */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Sujet *</label>
              <select value={sujet} onChange={e => setSujet(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors bg-white">
                {SUJETS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Message *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Décrivez votre demande..."
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors resize-none" />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={envoyer} disabled={sending}
            className="mt-6 w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
            {sending ? 'Envoi en cours...' : 'Envoyer le message →'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            L'hôte vous répondra directement par email.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}