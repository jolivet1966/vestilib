'use client'
// app/messages/page.tsx
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'

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

  const [hosts,          setHosts]          = useState<Host[]>([])
  const [selectedHostId, setSelectedHostId] = useState(hostIdParam ?? '')
  const [fromNom,        setFromNom]        = useState('')
  const [fromEmail,      setFromEmail]      = useState('')
  const [sujet,          setSujet]          = useState(SUJETS[0])
  const [message,        setMessage]        = useState('')
  const [sending,        setSending]        = useState(false)
  const [sent,           setSent]           = useState(false)
  const [error,          setError]          = useState('')

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center pb-24">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mb-6">✓</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Message envoyé !</h1>
      <p className="text-sm text-gray-400 mb-2">
        {selectedHost
          ? `Votre message à ${selectedHost.prenom} ${selectedHost.nom} a bien été transmis.`
          : 'Votre message a bien été transmis.'}
      </p>
      <p className="text-sm text-gray-400 mb-8">L'hôte vous répondra directement par email.</p>
      <Link href="/map" className="bg-[#1A3A6B] text-[#F5C84A] font-semibold px-8 py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
        Retour à la carte
      </Link>
      <NavBar />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-[#F5C84A]/70 hover:text-[#F5C84A] text-sm">← Accueil</Link>
        <span className="text-white/30">|</span>
        <span className="text-[#F5C84A] font-bold tracking-widest">Messages</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Contacter un hôte</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Hôte *</label>
              <select value={selectedHostId} onChange={e => setSelectedHostId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors bg-white">
                <option value="">Sélectionnez un hôte</option>
                {hosts.map(h => (
                  <option key={h.id} value={h.id}>{h.prenom} {h.nom} - {h.ville}</option>
                ))}
              </select>
            </div>
            {selectedHost && (
              <div className="bg-[#1A3A6B]/5 rounded-xl p-3 flex items-center ga
