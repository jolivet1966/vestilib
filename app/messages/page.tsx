'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore'

interface Host {
  id: string; prenom: string; nom: string; ville: string; adresse: string
}
interface Message {
  id: string; fromNom: string; fromEmail: string; sujet: string; message: string; lu: boolean; createdAt: any; reponse?: string
}
}

const SUJETS = [
  'Demande depot 24h', 'Demande depot 7 jours',
  'Question sur les horaires', 'Question sur les prestations', 'Autre demande',
]

function MessagesContent() {
  const params = useSearchParams()
  const hostIdParam = params.get('hostId')

  const [isHote, setIsHote] = useState(false)
  const [hostId, setHostId] = useState<string | null>(null)
  const [messagesRecus, setMessagesRecus] = useState<Message[]>([])
  const [vue, setVue] = useState<'inbox' | 'envoyer'>('inbox')

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

    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) return
      // Vérifier si hôte
      const snap = await getDocs(query(collection(db, 'hosts'), where('email', '==', firebaseUser.email)))
      if (snap.empty) return
      const hDoc = snap.docs[0]
      setIsHote(true)
      setHostId(hDoc.id)

      // Charger messages reçus
      const msgSnap = await getDocs(query(
        collection(db, 'messages'),
        where('hostId', '==', hDoc.id),
      ))
      const msgs = msgSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Message))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setMessagesRecus(msgs)

      // Marquer tous comme lus
      await Promise.all(
        msgSnap.docs.filter(d => !d.data().lu).map(d => updateDoc(doc(db, 'messages', d.id), { lu: true }))
      )
    })
    return () => unsub()
  }, [])

  const selectedHost = hosts.find(h => h.id === selectedHostId)

  const envoyer = async () => {
    if (!selectedHostId || !fromNom || !fromEmail || !message) { setError('Veuillez remplir tous les champs.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) { setError('Email invalide.'); return }
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
      <p className="text-sm text-gray-400 mb-8">L hote vous repondra par email.</p>
      <Link href="/map" className="bg-[#1A3A6B] text-[#F5C84A] font-semibold px-8 py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
        Retour a la carte
      </Link>
      <NavBar />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-[#F5C84A]/70 hover:text-[#F5C84A] text-sm">Accueil</Link>
        <span className="text-white/30">|</span>
        <span className="text-[#F5C84A] font-bold tracking-widest">Messages</span>
      </div>

      {isHote && (
        <div className="max-w-lg mx-auto px-4 pt-4 flex gap-2">
          <button onClick={() => setVue('inbox')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${vue === 'inbox' ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'bg-white text-gray-500 border border-gray-100'}`}>
            📥 Boite de reception ({messagesRecus.filter(m => !m.lu).length})
          </button>
          <button onClick={() => setVue('envoyer')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${vue === 'envoyer' ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'bg-white text-gray-500 border border-gray-100'}`}>
            ✉️ Envoyer
          </button>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* BOITE DE RECEPTION HOTE */}
        {isHote && vue === 'inbox' && (
          <div className="space-y-3">
            {messagesRecus.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-gray-400 text-sm">Aucun message recu.</p>
              </div>
            ) : messagesRecus.map(msg => (
              <div key={msg.id} className={`bg-white rounded-2xl border p-4 shadow-sm ${!msg.lu ? 'border-[#F5C84A]' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{msg.fromNom}</p>
                    <p className="text-xs text-gray-400">{msg.fromEmail}</p>
                  </div>
                  <div className="text-right">
                    {!msg.lu && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Nouveau</span>}
                    <p className="text-xs text-gray-400 mt-1">
                      {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-medium text-[#1A3A6B] mb-1">{msg.sujet}</p>
                <p className="text-sm text-gray-600 mb-3">{msg.message}</p>
                {msg.reponse ? (
  <div className="mt-2 bg-green-50 rounded-xl p-3 border border-green-100">
    <p className="text-xs font-semibold text-green-700 mb-1">Votre réponse :</p>
    <p className="text-xs text-gray-600">{msg.reponse}</p>
  </div>
) : (
  <RepondreForm messageId={msg.id} sujet={msg.sujet} />
)}
              </div>
            ))}
          </div>
        )}

        {/* FORMULAIRE ENVOI */}
        {(!isHote || vue === 'envoyer') && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Contacter un hote</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hote</label>
                <select value={selectedHostId} onChange={e => setSelectedHostId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors bg-white">
                  <option value="">Selectionnez un hote</option>
                  {hosts.map(h => (
                    <option key={h.id} value={h.id}>{h.prenom} {h.nom} - {h.ville}</option>
                  ))}
                </select>
              </div>
              {selectedHost && (
                <div className="bg-[#1A3A6B]/5 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1A3A6B] rounded-full flex items-center justify-center text-[#F5C84A] text-xs font-bold">
                    {selectedHost.prenom[0]}{selectedHost.nom[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedHost.prenom} {selectedHost.nom}</p>
                    <p className="text-xs text-gray-400">{selectedHost.adresse}, {selectedHost.ville}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Votre nom</label>
                <input type="text" value={fromNom} onChange={e => setFromNom(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Votre email</label>
                <input type="email" value={fromEmail} onChange={e => setFromEmail(e.target.value)}
                  placeholder="vous@email.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Sujet</label>
                <select value={sujet} onChange={e => setSujet(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors bg-white">
                  {SUJETS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Decrivez votre demande..."
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors resize-none" />
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={envoyer} disabled={sending}
              className="mt-6 w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
              {sending ? 'Envoi...' : 'Envoyer le message'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">L hote vous repondra par email.</p>
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