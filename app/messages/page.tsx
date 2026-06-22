'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

interface Conversation {
  id: string; hostId: string; hostNom: string
  clientEmail: string; clientNom: string
  lastMessage: string; updatedAt: any; luClient: boolean; luHote: boolean
  monRole: 'client' | 'hote'
}
interface Message {
  id: string; texte: string; auteur: string; clientNom: string; createdAt: string
}

function MessagesContent() {
  const params = useSearchParams()
  const router = useRouter()
  const hostIdParam = params.get('hostId')
  const convIdParam = params.get('convId')

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userNom, setUserNom] = useState<string>('')
  const [hostId, setHostId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(convIdParam)
  const [messages, setMessages] = useState<Message[]>([])
  const [texte, setTexte] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showNewConv, setShowNewConv] = useState(!!hostIdParam && !convIdParam)
  const [hosts, setHosts] = useState<{id: string; prenom: string; nom: string; ville: string}[]>([])
  const [selectedHostId, setSelectedHostId] = useState(hostIdParam ?? '')
  const [filtreDepart, setFiltreDepart] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const chargerConversations = async (email: string, hId: string | null) => {
    const toutes: Conversation[] = []

    const resClient = await fetch(`/api/conversations?clientEmail=${encodeURIComponent(email)}`)
    const dataClient = await resClient.json()
    const convsClient = (dataClient.conversations ?? []).map((c: any) => ({ ...c, monRole: 'client' }))
    toutes.push(...convsClient)

    if (hId) {
      const resHote = await fetch(`/api/conversations?hostId=${hId}`)
      const dataHote = await resHote.json()
      const convsHote = (dataHote.conversations ?? []).map((c: any) => ({ ...c, monRole: 'hote' }))
      convsHote.forEach((c: any) => {
        if (!toutes.find((t: any) => t.id === c.id)) toutes.push(c)
      })
    }

    toutes.sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0))
    setConversations(toutes)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) { router.push('/user/login?redirect=/messages'); return }
      setUserEmail(firebaseUser.email)
      setUserNom(firebaseUser.displayName ?? firebaseUser.email ?? '')

      const snap = await getDocs(query(collection(db, 'hosts'), where('email', '==', firebaseUser.email)))
      const hId = snap.empty ? null : snap.docs[0].id
      setHostId(hId)

      await chargerConversations(firebaseUser.email!, hId)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    fetch('/api/hosts').then(r => r.json()).then(d => setHosts(d.hosts ?? []))
  }, [])

  useEffect(() => {
    if (!selectedConvId) return
    const load = async () => {
      const conv = conversations.find(c => c.id === selectedConvId)
const role = conv?.monRole ?? 'client'
const res = await fetch(`/api/conversations/${selectedConvId}/messages?role=${role}`)
      const data = await res.json()
      setMessages(data.messages ?? [])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [selectedConvId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const envoyerNouveauMessage = async () => {
    if (!texte || !selectedHostId || !userEmail) return
    setSending(true); setError('')
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: selectedHostId, clientEmail: userEmail, clientNom: userNom, texte }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setTexte('')
      setShowNewConv(false)
      setSelectedConvId(data.convId)
      await chargerConversations(userEmail, hostId)
    } catch { setError('Erreur réseau.') }
    finally { setSending(false) }
  }

  const envoyerReponse = async () => {
    if (!texte || !selectedConvId || !userEmail) return
    setSending(true); setError('')
    try {
      const conv = conversations.find(c => c.id === selectedConvId)
      const auteur = conv?.monRole ?? 'client'
      const res = await fetch(`/api/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte, auteur, clientNom: userNom }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setTexte('')
      const res2 = await fetch(`/api/conversations/${selectedConvId}/messages?role=${conv?.monRole ?? 'client'}`)
      const data2 = await res2.json()
      setMessages(data2.messages ?? [])
      await chargerConversations(userEmail, hostId)
    } catch { setError('Erreur réseau.') }
    finally { setSending(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const convActive = conversations.find(c => c.id === selectedConvId)
  const interlocuteur = convActive?.monRole === 'hote' ? convActive?.clientNom : convActive?.hostNom

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#F5C84A]/70 hover:text-[#F5C84A] text-sm">Accueil</Link>
          <span className="text-white/30">|</span>
          <span className="text-[#F5C84A] font-bold tracking-widest">Messages</span>
        </div>
        {!selectedConvId && !showNewConv && (
          <button onClick={() => { setShowNewConv(true); setSelectedConvId(null) }}
            className="bg-[#F5C84A] text-[#1A3A6B] text-xs font-bold px-3 py-1.5 rounded-lg">
            + Nouveau
          </button>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {showNewConv && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Nouveau message</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Département</label>
<select onChange={e => setFiltreDepart(e.target.value)}
  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] bg-white mb-3">
  <option value="">Tous les départements</option>
  {[...new Set(hosts.map(h => h.codePostal?.slice(0,2)).filter(Boolean))].sort().map(dep => (
    <option key={dep} value={dep}>{dep}</option>
  ))}
</select>
                <label className="text-xs text-gray-500 block mb-1">Hôte</label>
                <select value={selectedHostId} onChange={e => setSelectedHostId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] bg-white">
                  <option value="">Sélectionnez un hôte</option>
{hosts.filter(h => !filtreDepart || h.codePostal?.startsWith(filtreDepart)).map(h => (
                    <option key={h.id} value={h.id}>{h.prenom} {h.nom} - {h.ville}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Message</label>
                <textarea value={texte} onChange={e => setTexte(e.target.value)}
                  placeholder="Votre message..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] resize-none" />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button onClick={envoyerNouveauMessage} disabled={sending || !texte || !selectedHostId}
                  className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {sending ? 'Envoi...' : 'Envoyer'}
                </button>
                <button onClick={() => setShowNewConv(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedConvId && !showNewConv && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
            <div className="flex items-center gap-3 p-4 border-b border-gray-50">
              <button onClick={() => setSelectedConvId(null)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
              <p className="text-sm font-semibold text-gray-800">{interlocuteur ?? 'Conversation'}</p>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {messages.map(msg => {
                const monRole = convActive?.monRole ?? 'client'
                const isMine = (monRole === 'client' && msg.auteur === 'client') || (monRole === 'hote' && msg.auteur === 'hote')
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-[#1A3A6B] text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className="text-sm">{msg.texte}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-50">
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2">
                <textarea value={texte} onChange={e => setTexte(e.target.value)}
                  placeholder="Votre message..."
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

        {!selectedConvId && !showNewConv && (
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <p className="text-3xl mb-3">💬</p>
                <p className="text-gray-400 text-sm">Aucune conversation.</p>
              </div>
            ) : conversations.map(conv => {
              const nonLu = conv.monRole === 'hote' ? !conv.luHote : !conv.luClient
              const nom = conv.monRole === 'hote' ? conv.clientNom : conv.hostNom
              return (
                <div key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-[#1A3A6B]/20 transition-colors">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-800">{nom}</p>
                    {nonLu && <span className="w-2 h-2 bg-red-500 rounded-full mt-1 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <NavBar />
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