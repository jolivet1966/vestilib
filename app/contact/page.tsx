'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function ContactPage() {
  const router = useRouter()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [sujet, setSujet] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.email) setEmail(user.email)
      if (user?.displayName) setNom(user.displayName)
    })
    return () => unsub()
  }, [])

  const envoyer = async () => {
    if (!nom || !email || !sujet || !message) {
      setStatusMsg('Merci de remplir tous les champs.')
      return
    }
    setSending(true)
    setStatusMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromEmail: email, fromNom: nom, sujet, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatusMsg(data.error ?? 'Erreur lors de l\'envoi.')
        return
      }
      setSent(true)
    } catch {
      setStatusMsg('Erreur réseau. Merci de réessayer.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1A3A6B] px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-white/70 text-sm mb-3">← Retour</button>
          <p className="text-[#F5C84A] text-xs font-semibold uppercase tracking-wider mb-1">Vestilib</p>
          <h1 className="text-white text-2xl font-black">Nous contacter</h1>
          <p className="text-white/50 text-sm mt-1">Notre équipe vous répond par email dans les plus brefs délais</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {sent ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#1A3A6B]">Message envoyé !</h2>
            <p className="text-sm text-gray-500">Vous allez recevoir une confirmation à l'adresse <strong>{email}</strong>. Notre équipe vous répondra directement par email.</p>
            <button onClick={() => router.push('/profil')}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-bold py-3 rounded-xl hover:bg-[#0C2447] transition-colors text-sm">
              Retour au profil
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Votre nom *</label>
              <input type="text" value={nom} onChange={e => setNom(e.target.value)}
                placeholder="Votre nom"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Votre email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@email.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B]" />
              <p className="text-[10px] text-gray-400 mt-1">Nous vous répondrons uniquement à cette adresse, jamais depuis une autre.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Sujet *</label>
              <input type="text" value={sujet} onChange={e => setSujet(e.target.value)}
                placeholder="Ex: Question sur une réservation"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Message *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Votre message..."
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] resize-none" />
            </div>
            {statusMsg && <p className="text-sm text-center font-medium text-red-500">{statusMsg}</p>}
            <button onClick={envoyer} disabled={sending}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-bold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors text-sm">
              {sending ? 'Envoi...' : 'Envoyer le message'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}