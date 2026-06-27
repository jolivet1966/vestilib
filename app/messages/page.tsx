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
  const [hosts, setHosts] = useState<{id: string; prenom: string; nom: string; ville: string; codePostal?: string}[]>([])
  const [selectedHostId, setSelectedHostId] = useState(hostIdParam ?? '')
  const [filtreDepart, setFiltreDepart] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationsRef = useRef<Conversation[]>([])

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
    conversationsRef.current = toutes
    setConversations(toutes)
    return toutes
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
      const conv = conversationsRef.current.find(c => c.id === selectedConvId)
      const role = conv?.monRole ?? 'client'
      // Marquer comme lu
      try {
        await fetch(`/api/conversations/${selectedConvId}/lu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        })
      } catch {}
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

  const supprimerMessage = async (messageId: string) => {
    if (!selectedConvId) return
    if (!window.confirm('Supprimer ce message ?')) return
    try {
      await fetch(`/api/conversations/${selectedConvId}/messages/${messageId}`, { method: 'DELETE' })
      setMessages(prev => prev.filter(m => m.id !== messageId))
    } catch {}
  }

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
      await chargerConversations(userEmail, hostId)
      setSelectedConvId(data.convId)
    } catch { setError('Erreur reseau.') }
    finally { setSending(false) }
  }

  const envoyerReponse = async () => {
    if (!texte || !selectedConvId || !userEmail) return
    setSending(true); setError('')
    try {
      const conv = conversationsRef.current.find(c => c.id === selectedConvId)
      const auteur = conv?.monRole ?? 'client'
      const res = await fetch(`/api/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte, auteur, clientNom: userNom }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setTexte('')
      const res2 = await fetch(`/api/conversations/${selectedConvId}/messages?role=${auteur}`)
      const data2 = await res2.json()
      setMessages(data2.messages ?? [])
      await chargerConversations(userEmail, hostId)
    } catch { setError('Erreur reseau.') }
    finally { setSending(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    </div>
  )

  const convActive = conversationsRef.current.find(c => c.id === selectedConvId)
  const interlocuteur = convActive?.monRole === 'hote' ? convActive?.clientNom : convActive?.hostNom
  const initiales = (nom: string) => nom?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'
  const nbNonLus = conversations.filter(c => c.monRole === 'hote' ? !c.luHote : !c.luClient).length

  const formatDate = (updatedAt: any) => {
    if (!updatedAt?.seconds) return ''
    const d = new Date(updatedAt.seconds * 1000)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'a l\'instant'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
    if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24">

      {/* HEADER */}
      <div className="bg-[#1A3A6B] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #F5C84A 0%, transparent 60%)' }} />
        <div className="relative px-4 pt-10 pb-5">
          <div className="max-w-lg mx-auto">
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/50 text-xs mb-4 hover:text-white/80 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Accueil
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(selectedConvId || showNewConv) && (
                  <button onClick={() => { setSelectedConvId(null); setShowNewConv(false) }}
                    className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M19 12H5M12 5l-7 7 7 7"/>
                    </svg>
                  </button>
                )}
                <div>
                  <h1 className="text-white font-bold text-lg">
                    {showNewConv ? 'Nouveau message' : selectedConvId ? interlocuteur ?? 'Conversation' : 'Messages'}
                  </h1>
                  {!selectedConvId && !showNewConv && (
                    <p className="text-white/50 text-xs mt-0.5">
                      {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
                      {nbNonLus > 0 && ` · ${nbNonLus} non lu${nbNonLus > 1 ? 's' : ''}`}
                    </p>
                  )}
                  {selectedConvId && convActive && (
                    <p className="text-white/50 text-xs mt-0.5">
                      {convActive.monRole === 'hote' ? 'Vous etes hote' : 'Vous etes client'}
                    </p>
                  )}
                </div>
              </div>
              {!selectedConvId && !showNewConv && (
                <button onClick={() => { setShowNewConv(true); setSelectedConvId(null) }}
                  className="bg-[#F5C84A] text-[#1A3A6B] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-[#e6b22a] transition-colors active:scale-95">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Nouveau
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* ===== NOUVEAU MESSAGE ===== */}
        {showNewConv && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Filtrer par departement
                </label>
                <select onChange={e => setFiltreDepart(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] bg-white text-gray-700">
                  <option value="">Tous les departements</option>
                  {(Array.from(new Set(hosts.map(h => h.codePostal?.slice(0, 2)).filter(Boolean))) as string[]).sort().map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Choisir un hote
                </label>
                <select value={selectedHostId} onChange={e => setSelectedHostId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] bg-white text-gray-700">
                  <option value="">Selectionnez un hote</option>
                  {hosts.filter(h => !filtreDepart || h.codePostal?.startsWith(filtreDepart)).map(h => (
                    <option key={h.id} value={h.id}>{h.prenom} {h.nom} — {h.ville}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Votre message
                </label>
                <textarea value={texte} onChange={e => setTexte(e.target.value)}
                  placeholder="Ecrivez votre message ici..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-[#1A3A6B] focus:ring-1 focus:ring-[#1A3A6B]/20 resize-none transition-all" />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowNewConv(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={envoyerNouveauMessage} disabled={sending || !texte || !selectedHostId}
                  className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 hover:bg-[#0C2447] transition-colors flex items-center justify-center gap-2">
                  {sending ? (
                    <><div className="w-4 h-4 border-2 border-[#F5C84A] border-t-transparent rounded-full animate-spin" /> Envoi...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg> Envoyer</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== VUE CONVERSATION ===== */}
        {selectedConvId && !showNewConv && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 280px)', minHeight: '300px' }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <p className="text-xs">Aucun message</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const monRole = convActive?.monRole ?? 'client'
                const isMine = (monRole === 'client' && msg.auteur === 'client') || (monRole === 'hote' && msg.auteur === 'hote')
                const showDate = i === 0 || (msg.createdAt && messages[i-1]?.createdAt &&
                  new Date(msg.createdAt).toDateString() !== new Date(messages[i-1].createdAt).toDateString())
                return (
                  <div key={msg.id}>
                    {showDate && msg.createdAt && (
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-gray-100" />
                        <p className="text-[10px] text-gray-300 font-medium">
                          {new Date(msg.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    )}
                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
                      {!isMine && (
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-auto mb-1">
                          <span className="text-[9px] font-bold text-gray-500">{initiales(interlocuteur ?? '')}</span>
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          isMine ? 'bg-[#1A3A6B] text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.texte}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <p className="text-[10px] text-gray-300">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                          {isMine && (
                            <button onClick={() => supprimerMessage(msg.id)}
                              className="text-red-500 hover:text-red-700 transition-colors active:scale-95">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-gray-100 bg-gray-50/50">
              {error && <p className="text-xs text-red-600 mb-2 px-1">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea value={texte} onChange={e => setTexte(e.target.value)}
                  placeholder="Ecrivez un message..."
                  rows={1}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerReponse() } }}
                  className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] focus:ring-1 focus:ring-[#1A3A6B]/20 resize-none bg-white transition-all"
                  style={{ maxHeight: '100px', overflowY: 'auto' }} />
                <button onClick={envoyerReponse} disabled={sending || !texte}
                  className="w-10 h-10 bg-[#1A3A6B] text-[#F5C84A] rounded-2xl flex items-center justify-center disabled:opacity-40 hover:bg-[#0C2447] transition-colors active:scale-95 flex-shrink-0">
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-[#F5C84A] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== LISTE DES CONVERSATIONS ===== */}
        {!selectedConvId && !showNewConv && (
          <div className="space-y-2">
            {/* Bandeau réservations en attente */}
            {hostId && (
              <ResaBandeauHote hostId={hostId} />
            )}
            {conversations.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Aucune conversation</p>
                <p className="text-xs text-gray-400 mb-4">Contactez un hote pour commencer</p>
                <button onClick={() => setShowNewConv(true)}
                  className="inline-flex items-center gap-2 bg-[#1A3A6B] text-[#F5C84A] font-bold text-sm py-2.5 px-5 rounded-xl hover:bg-[#0C2447] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Nouveau message
                </button>
              </div>
            ) : conversations.map(conv => {
              const nonLu = conv.monRole === 'hote' ? !conv.luHote : !conv.luClient
              const nom = conv.monRole === 'hote' ? conv.clientNom : conv.hostNom
              const couleurAvatar = conv.monRole === 'hote' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1A3A6B]/10 text-[#1A3A6B]'
              return (
                <div key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                  className={`bg-white rounded-2xl border cursor-pointer transition-all active:scale-[0.98] ${
                    nonLu ? 'border-[#1A3A6B]/20 shadow-md' : 'border-gray-100 shadow-sm hover:border-gray-200'
                  }`}>
                  <div className="p-4 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${couleurAvatar}`}>
                      {initiales(nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-sm truncate ${nonLu ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                          {nom}
                        </p>
                        <span className="text-[10px] text-gray-300 flex-shrink-0">{formatDate(conv.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs truncate flex-1 ${nonLu ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                          {conv.lastMessage || 'Aucun message'}
                        </p>
                        {nonLu && <span className="w-2 h-2 bg-[#1A3A6B] rounded-full flex-shrink-0" />}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                        conv.monRole === 'hote' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1A3A6B]/8 text-[#1A3A6B]'
                      }`}>
                        {conv.monRole === 'hote' ? 'Hote' : 'Client'}
                      </span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" className="flex-shrink-0">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
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
function ResaBandeauHote({ hostId }: { hostId: string }) {
  const [nb, setNb] = useState(0)
  useEffect(() => {
    import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
      import('@/lib/firebase').then(({ db }) => {
        const q = query(collection(db, 'bookings'), where('hostId', '==', hostId), where('status', '==', 'awaiting_approval'))
        return onSnapshot(q, snap => setNb(snap.size))
      })
    })
  }, [hostId])
  if (nb === 0) return null
  return (
    <a href="/host/dashboard"
      className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors">
      <span className="text-xl flex-shrink-0">🔔</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-amber-800">
          {nb} demande{nb > 1 ? 's' : ''} de reservation en attente
        </p>
        <p className="text-xs text-amber-600 mt-0.5">Rendez-vous dans votre espace hote pour traiter</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" className="flex-shrink-0">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </a>
  )
}
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}