'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'

interface Host {
  id: string; prenom: string; nom: string; ville: string; adresse: string
}

const SUJETS = [
  'Demande depot 24h',
  'Demande depot 7 jours',
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
    } catch { setError('Erreur reseau.') }
    finally { setSending(false) }
  }

  if (sent) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center pb-24">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mb-6">OK</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Message envoye !</h1>
      <p c