'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface Conversation {
  id: string; hostId: string; hostNom: string
  clientEmail: string; clientNom: string
  lastMessage: string; updatedAt: any; luHote: boolean
}
interface Message {
  id: string; texte: string; auteur: string; clientNom: string; createdAt: string
}

export default function HostMessagesPage() {
  const router = useRouter()
  const [hostId, setHostId] = useState<string | null>(null)
  const [hostPrenom, setHostPrenom] = useState('')
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [texte, setTexte] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) { router.push('/host/login'); return }

      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      const snap = await getDoc(doc(db, 'hosts', firebaseUser.uid))
      if (!snap.exists()) { router.push('/host/login'); return }

      const hDoc = snap
      setHostId(hDoc.id)
      setHostPrenom(hDoc.data().prenom)

      const res = await fetch(`/api/conversations?hostId=${hDoc.id}`)
      const data = await res.json()
      setConversations(data.conversations ?? [])
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!selectedConvId) return
    const load = async () => {
      const res = await fetch(`/api/conversations/${selectedConvId}/messages`)
      const data = await res.json()
      setMessages(data.messages ?? [])
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [selectedConvId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const envoyerReponse = async () => {
    if (!texte || !selectedConvId) return
    setSending(true); setError('')
    try {
      const res = await fetch(`/api/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte, auteur: 'hote' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setTexte('')
      const res2 = await fetch(`/api/conversations/${selectedConvId}/messages`)
      const data2 = await res2.json()
      setMessages(data2.messages ?? [])

      // Recharger conversations
      if (hostId) {
        const res3 = await fetch(`/api/conversations?hostId=${hostId}`)
        const data3 = await res3.json()
        setConversations(data3.conversations ?? [])
      }
    } catch { setError('Erreur réseau.') }
    finally { setSending(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center gap-3">
        <Link href="/host/dashboard" className="text-[#F5C84A]/70 hover:text-[#F5C84A] text-sm">Dashboard</Link>
        <span className="text-white/30">|</span>
        <span className="text-[#F5C84A] font-bold tracking-widest">Messages</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* CONVERSATION ACTIVE */}
        {selectedConvId && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
            <div className="flex items-center gap-3 p-4 border-b border-gray-50">
              <button onClick={() => setSelectedConvId(null)} className="text-gray-400 hover:text-gray-600">←</button>
              <p className="text-sm font-semibold text-gray-800">
                {conversations.find(c => c.id === selectedConvId)?.clientNom ?? 'Client'}
              </p>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.auteur === 'hote' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.auteur === 'hote'
                      ? 'bg-[#1A3A6B] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm">{msg.texte}</p>
                    <p className={`text-[10px] mt-1 ${msg.auteur === 'hote' ? 'text-white/60' : 'text-gray-400'}`}>
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-50">
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2">
                <textarea value={texte} onChange={e => setTexte(e.target.value)}
                  placeholder="Votre réponse..."
                  rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerReponse() } }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1A3A6B] resize-none" />
                <button onClick={envoyerReponse} disabled={sending || !texte}
                  className="bg-[#1A3A6B] text-[#F5C84A] font-bold px-4 rounded-xl disabled:opacity-50">
                  ➤
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LISTE CONVERSATIONS */}
        {!selectedConvId && (
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <p className="text-3xl mb-3">💬</p>
                <p className="text-gray-400 text-sm">Aucune conversation.</p>
              </div>
            ) : conversations.map(conv => (
              <div key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-[#1A3A6B]/20 transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800">{conv.clientNom}</p>
                  {!conv.luHote && <span className="w-2 h-2 bg-red-500 rounded-full mt-1" />}
                </div>
                <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}