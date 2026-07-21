'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'

interface UserData {
  id: string; prenom: string; nom: string; email: string; telephone: string
}
interface HostData {
  id: string; prenom: string; nom: string; email: string; ville: string; telephone?: string
  stripePayoutsEnabled: boolean; capaciteMax?: number
  capaciteMaxMoto?: number; capaciteMaxVelo?: number
}
interface Balance {
  available: number; pending: number
  recentPayouts: { id: string; amount: number; status: string; arrivalDate: string }[]
}
interface ResaWithHost {
  id: string
  bookingCode?: string
  status: string
  date?: string
  creneau?: string
  totalAmount?: number
  paymentUrl?: string
  hostId?: string
  hostEmail?: string
  hostTelephone?: string
  createdAt?: { seconds: number }
  [key: string]: any
}

export default function ProfilPage() {
  const router = useRouter()
  const [menu, setMenu] = useState<'utilisateur' | 'hote'>('utilisateur')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [hostData, setHostData] = useState<HostData | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [totalGagne, setTotalGagne] = useState(0)
  const [mesResas, setMesResas] = useState<ResaWithHost[]>([])
  const [resasArchivees, setResasArchivees] = useState<Set<string>>(new Set())
  const [showArchivees, setShowArchivees] = useState(false)
  const [loading, setLoading] = useState(true)

  const [editMode, setEditMode] = useState(false)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')

  // Téléphone hôte
  const [editTelHote, setEditTelHote] = useState(false)
  const [telephoneHote, setTelephoneHote] = useState('')
  const [savingTelHote, setSavingTelHote] = useState(false)
  const [telHoteMsg, setTelHoteMsg] = useState('')

  const [showPwd, setShowPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const archivesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('vestilib_resas_archivees')
    if (stored) setResasArchivees(new Set(JSON.parse(stored)))
  }, [])

  const archiverResa = (id: string) => {
    setResasArchivees(prev => {
      const next = new Set(Array.from(prev))
      next.add(id)
      localStorage.setItem('vestilib_resas_archivees', JSON.stringify(Array.from(next)))
      return next
    })
  }

  const desarchiverResa = (id: string) => {
    setResasArchivees(prev => {
      const next = new Set(Array.from(prev))
      next.delete(id)
      localStorage.setItem('vestilib_resas_archivees', JSON.stringify(Array.from(next)))
      return next
    })
  }

  const toggleArchivees = () => {
    setShowArchivees(prev => {
      const next = !prev
      if (next) {
        setTimeout(() => archivesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
      }
      return next
    })
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) { router.push('/user/login'); return }
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData({ id: firebaseUser.uid, ...data } as UserData)
          setPrenom(data.prenom ?? '')
          setNom(data.nom ?? '')
          setTelephone(data.telephone ?? '')
        } else {
          const newUser = {
            prenom: firebaseUser.displayName?.split(' ')[0] ?? '',
            nom: firebaseUser.displayName?.split(' ').slice(1).join(' ') ?? '',
            email: firebaseUser.email ?? '',
            telephone: '',
            role: 'user',
            createdAt: new Date(),
          }
          setUserData({ id: firebaseUser.uid, ...newUser })
          setPrenom(newUser.prenom)
          setNom(newUser.nom)
        }

        let hostDocData: any = null
        let hostDocId: string | null = null

        const hostByUid = await getDoc(doc(db, 'hosts', firebaseUser.uid))
        if (hostByUid.exists()) {
          hostDocData = hostByUid.data()
          hostDocId = hostByUid.id
        }

        if (hostDocData && hostDocId) {
          setHostData({ id: hostDocId, ...hostDocData } as HostData)
          setHostId(hostDocId)
          const hostPrivateSnap = await getDoc(doc(db, 'hosts', hostDocId, 'private', 'contact'))
          setTelephoneHote(hostPrivateSnap.exists() ? (hostPrivateSnap.data().telephone ?? '') : '')
          const bookSnap = await getDocs(query(collection(db, 'bookings'), where('hostId', '==', hostDocId)))
          const total = bookSnap.docs
            .filter(d => d.data().status === 'paid')
            .reduce((s, d) => s + (d.data().hostEarns ?? 0), 0)
          setTotalGagne(total)
          const balRes = await fetch(`/api/host-balance?hostId=${hostDocId}`)
          if (balRes.ok) setBalance(await balRes.json())
        }

        const resaSnap = await getDocs(query(collection(db, 'bookings'), where('customerEmail', '==', firebaseUser.email)))
        const enCours: ResaWithHost[] = resaSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as ResaWithHost))
          .filter(r => ['pending', 'awaiting_approval', 'accepted', 'authorized', 'paid'].includes(r.status))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))

        // Le telephone/email de l'hote sont deja copies sur la reservation par le backend au moment du paiement
        setMesResas(enCours)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    })
    return () => unsub()
  }, [router])

  const sauvegarderInfos = async () => {
    if (!userData) return
    setSavingInfo(true); setInfoMsg('')
    try {
      await updateDoc(doc(db, 'users', userData.id), { prenom, nom, telephone })
      setUserData(prev => prev ? { ...prev, prenom, nom, telephone } : null)
      setInfoMsg('Informations mises a jour')
      setEditMode(false)
    } catch { setInfoMsg('Erreur lors de la sauvegarde') }
    finally { setSavingInfo(false) }
  }

  const sauvegarderTelephoneHote = async () => {
    if (!hostId) return
    setSavingTelHote(true); setTelHoteMsg('')
    try {
      await setDoc(doc(db, 'hosts', hostId, 'private', 'contact'), { telephone: telephoneHote }, { merge: true })
      setHostData(prev => prev ? { ...prev, telephone: telephoneHote } : null)
      setTelHoteMsg('Telephone mis a jour')
      setEditTelHote(false)
    } catch { setTelHoteMsg('Erreur lors de la sauvegarde') }
    finally { setSavingTelHote(false) }
  }

  const changerMotDePasse = async () => {
    const firebaseUser = auth.currentUser
    if (!firebaseUser?.email) return
    setSavingPwd(true); setPwdMsg('')
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, oldPwd)
      await reauthenticateWithCredential(firebaseUser, credential)
      await updatePassword(firebaseUser, newPwd)
      setPwdMsg('Mot de passe mis a jour')
      setOldPwd(''); setNewPwd('')
    } catch (e: any) {
      setPwdMsg(e.code === 'auth/wrong-password' ? 'Ancien mot de passe incorrect' : 'Erreur')
    } finally { setSavingPwd(false) }
  }
  const annulerReservation = async (bookingId: string) => {
  if (!window.confirm('Confirmer l\'annulation ? Cette action est irréversible.')) return
  try {
    const res = await fetch('/api/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, cancelledBy: 'client' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Erreur')
    setMesResas(prev => prev.filter(r => r.id !== bookingId))
    alert('Réservation annulée.')
  } catch (e: any) {
    alert(`Erreur : ${e.message}`)
  }
}
  const deconnecter = async () => { await signOut(auth); router.push('/') }

  const supprimerCompte = async () => {
    const firebaseUser = auth.currentUser
    if (!firebaseUser || !userData) return
    try {
      try { await deleteDoc(doc(db, 'users', userData.id)) } catch {}
      if (hostId) {
        try { await deleteDoc(doc(db, 'hosts', hostId)) } catch {}
      }
      await firebaseUser.delete()
      router.push('/?compte=supprime')
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        alert('Pour des raisons de securite, veuillez vous deconnecter puis vous reconnecter avant de supprimer votre compte.')
      } else {
        alert(`Erreur : ${e.code} — ${e.message}`)
      }
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Chargement du profil...</p>
      </div>
    </div>
  )

  if (!userData) return null

  const initiales = `${userData.prenom?.[0] ?? ''}${userData.nom?.[0] ?? ''}`.toUpperCase()
  const isHote = !!hostData
  const resasActives = mesResas.filter(r => r.status !== 'paid')
  const resasPayees = mesResas.filter(r => r.status === 'paid')
  const resasPayeesVisibles = resasPayees.filter(r => !resasArchivees.has(r.id))
  const resasPayeesArchivees = resasPayees.filter(r => resasArchivees.has(r.id))

  const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    authorized: { label: 'Paiement autorisé', color: 'text-violet-700', bg: 'bg-violet-50', dot: 'bg-violet-500' },
    paid: { label: 'Confirmee', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    accepted: { label: 'Paiement en attente', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
    awaiting_approval: { label: 'En attente de validation', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    pending: { label: 'En cours', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-28">
      <div className="hidden md:block h-16" />

      {/* HEADER */}
      <div className="bg-[#1A3A6B] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #F5C84A 0%, transparent 60%)' }} />
        <div className="relative px-4 pt-10 md:pt-5 pb-8 md:pb-4">
          <div className="max-w-lg mx-auto">
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/50 text-xs mb-6 md:hidden hover:text-white/80 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Accueil
            </Link>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F5C84A] to-[#e6b22a] flex items-center justify-center shadow-lg">
                  <span className="text-[#1A3A6B] text-2xl font-black">{initiales}</span>
                </div>
                {isHote && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md border-2 border-[#1A3A6B]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-xl leading-tight">{userData.prenom} {userData.nom}</p>
                <p className="text-white/50 text-sm mt-0.5 truncate">{userData.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-semibold bg-white/10 text-white/80 px-2.5 py-1 rounded-full border border-white/10">Membre</span>
                  {isHote && (
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/20">Hote verifie</span>
                  )}
                </div>
              </div>
            </div>
            {mesResas.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <p className="text-2xl font-black text-[#F5C84A]">{mesResas.length}</p>
                  <p className="text-white/60 text-xs mt-0.5">reservation{mesResas.length > 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <p className="text-2xl font-black text-emerald-400">{resasPayees.length}</p>
                  <p className="text-white/60 text-xs mt-0.5">confirme{resasPayees.length > 1 ? 'es' : 'e'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto flex">
          <button onClick={() => setMenu('utilisateur')}
            className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
              menu === 'utilisateur' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Mon profil
          </button>
          {isHote && (
            <button onClick={() => setMenu('hote')}
              className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                menu === 'hote' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Espace hote
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ===== ONGLET UTILISATEUR ===== */}
        {menu === 'utilisateur' && (
          <>
            {/* RESERVATIONS EN COURS */}
            {resasActives.length > 0 && (
              <section>
                <SectionTitle icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                } label="Reservations en cours" />
                <div className="space-y-3">
                  {resasActives.map(r => {
                    const st = statusConfig[r.status] ?? statusConfig.pending
                    return (
                      <div key={r.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className={`h-1 w-full ${st.dot}`} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <p className="font-mono font-bold text-[#1A3A6B] text-base">{r.bookingCode}</p>
                              {r.date && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                  {r.creneau && ` · ${r.creneau}`}
                                </p>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full flex-shrink-0 flex items-center gap-1.5 ${st.color} ${st.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot} inline-block`} />
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-800">{r.totalAmount} EUR</p>
                            {r.status === 'accepted' && r.paymentUrl && (
                              <a href={r.paymentUrl}
                                className="bg-[#1A3A6B] text-[#F5C84A] font-bold text-xs py-2 px-4 rounded-xl hover:bg-[#0C2447] active:scale-95 transition-all">
                               Payer maintenant
              </a>
            )}
            </div>
            {r.status === 'authorized' && r.date && (() => {
              const datePrestation = new Date(r.date + 'T00:00:00')
              const dans48h = new Date(Date.now() + 48 * 60 * 60 * 1000)
              if (datePrestation > dans48h) {
                return (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => annulerReservation(r.id)}
                      className="flex-1 border border-red-200 text-red-600 font-semibold text-xs py-2 px-4 rounded-xl hover:bg-red-50 active:scale-95 transition-all">
                      Annuler la réservation
                    </button>
                    <button
                      onClick={() => alert('Vous pouvez annuler votre réservation au plus tard 48 heures avant le début de la prestation, votre carte ne sera pas débitée, aucun frais ne sera retenu. La réservation est ferme et définitive au-delà de ce délai.')}
                      className="w-7 h-7 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors"
                      title="Information annulation">
                      <span className="text-gray-400 text-xs font-bold">i</span>
                    </button>
                  </div>
                )
              }
              return null
            })()}
                          </div>
                        </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* RESERVATIONS CONFIRMEES */}
            {resasPayeesVisibles.length > 0 && (
              <section>
                <SectionTitle icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                } label="Reservations confirmees" />
                <div className="space-y-3">
                  {resasPayeesVisibles.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
                      <div className="h-1 w-full bg-emerald-500" />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-mono font-bold text-[#1A3A6B] text-base">{r.bookingCode}</p>
                            {r.date && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                {r.creneau && ` · ${r.creneau}`}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-700">{r.totalAmount} EUR</span>
                            <button onClick={() => archiverResa(r.id)}
                              title="Archiver cette reservation"
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                                <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
                                <line x1="10" y1="12" x2="14" y2="12"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        {(r.hostEmail || r.hostTelephone) && (
                          <div className="bg-[#1A3A6B]/5 rounded-xl p-3 border border-[#1A3A6B]/10">
                            <p className="text-xs font-bold text-[#1A3A6B] mb-2 flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                              </svg>
                              Coordonnees de votre hote
                            </p>
                            <div className="space-y-1.5">
                              {r.hostEmail && (
                                <a href={`mailto:${r.hostEmail}`}
                                  className="flex items-center gap-2 text-xs text-[#1A3A6B] font-medium hover:underline">
                                  <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">✉️</span>
                                  {r.hostEmail}
                                </a>
                              )}
                              {r.hostTelephone ? (
                                <a href={`tel:${r.hostTelephone}`}
                                  className="flex items-center gap-2 text-xs text-[#1A3A6B] font-medium hover:underline">
                                  <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">📞</span>
                                  {r.hostTelephone}
                                </a>
                              ) : (
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 opacity-50">📞</span>
                                  Telephone non renseigne
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ARCHIVES — toujours visible si archives existent */}
            {resasPayeesArchivees.length > 0 && (
              <section ref={archivesRef}>
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#1A3A6B]/50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
                        <line x1="10" y1="12" x2="14" y2="12"/>
                      </svg>
                    </span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Archives</p>
                  </div>
                  <button onClick={toggleArchivees}
                    className="text-xs text-[#1A3A6B] font-semibold hover:underline flex items-center gap-1">
                    {showArchivees ? 'Masquer' : `Voir (${resasPayeesArchivees.length})`}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`transition-transform ${showArchivees ? 'rotate-180' : ''}`}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                </div>

                {showArchivees && (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2.5 flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {resasPayeesArchivees.length} archivee{resasPayeesArchivees.length > 1 ? 's' : ''}
                      </p>
                      <button
                        onClick={() => {
                          if (window.confirm('Supprimer toutes les reservations archivees ?')) {
                            setMesResas(prev => prev.filter(x => !resasArchivees.has(x.id)))
                            setResasArchivees(new Set())
                            localStorage.setItem('vestilib_resas_archivees', '[]')
                            setShowArchivees(false)
                          }
                        }}
                        className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors">
                        Tout supprimer
                      </button>
                    </div>
                    {resasPayeesArchivees.map((r, i) => (
                      <div key={r.id} className={`bg-white px-4 py-3 flex items-center justify-between ${i < resasPayeesArchivees.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-bold text-gray-400 text-sm">{r.bookingCode}</p>
                          {r.date && (
                            <p className="text-xs text-gray-300 mt-0.5">
                              {new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                          <p className="text-xs text-gray-300">{r.totalAmount} EUR</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                          <button onClick={() => desarchiverResa(r.id)}
                            title="Restaurer"
                            className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 hover:border-[#1A3A6B] hover:bg-blue-50 flex items-center justify-center transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.76"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Supprimer definitivement cette reservation ?')) {
                                setMesResas(prev => prev.filter(x => x.id !== r.id))
                                desarchiverResa(r.id)
                              }
                            }}
                            title="Supprimer definitivement"
                            className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Aucune reservation */}
            {mesResas.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">🎫</div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Aucune reservation</p>
                <p className="text-xs text-gray-400 mb-4">Trouvez un hote pres de vous pour deposer vos bagages</p>
                <Link href="/map"
                  className="inline-flex items-center gap-2 bg-[#1A3A6B] text-[#F5C84A] font-semibold text-sm py-2.5 px-5 rounded-xl hover:bg-[#0C2447] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  Voir la carte
                </Link>
              </div>
            )}

            {/* INFOS PERSONNELLES */}
            <section>
              <SectionTitle icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              } label="Informations personnelles" />
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {editMode ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Prenom" value={prenom} onChange={setPrenom} />
                      <Field label="Nom" value={nom} onChange={setNom} />
                    </div>
                    <Field label="Telephone" value={telephone} onChange={setTelephone} type="tel" />
                    {infoMsg && <p className="text-sm text-center text-emerald-600 font-medium">{infoMsg}</p>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditMode(false)}
                        className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                        Annuler
                      </button>
                      <button onClick={sauvegarderInfos} disabled={savingInfo}
                        className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-bold py-2.5 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors text-sm">
                        {savingInfo ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-50">
                      <InfoRow icon="👤" label="Nom" value={`${userData.prenom} ${userData.nom}`} />
                      <InfoRow icon="✉️" label="Email" value={userData.email} />
                      <InfoRow icon="📞" label="Telephone" value={userData.telephone || 'Non renseigne'} />
                    </div>
                    <div className="px-4 py-3 border-t border-gray-50">
                      <button onClick={() => setEditMode(true)}
                        className="w-full text-center text-sm font-semibold text-[#1A3A6B] hover:text-[#0C2447] transition-colors py-1">
                        Modifier mes informations
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* DEVENIR HOTE */}
            {!isHote && (
              <div className="bg-gradient-to-br from-[#1A3A6B] to-[#0C2447] rounded-2xl p-5 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#F5C84A]/20 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">🏠</div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm mb-1">Proposer un point de depot</p>
                    <p className="text-white/60 text-xs mb-3">Rejoignez le reseau VESTILIB et generez des revenus supplementaires.</p>
                    <Link href="/host/onboard"
                      className="inline-flex items-center gap-2 bg-[#F5C84A] text-[#1A3A6B] font-bold text-sm py-2.5 px-4 rounded-xl hover:bg-[#e6b22a] transition-colors active:scale-95">
                      Devenir hote
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* MOT DE PASSE */}
            <section>
              <SectionTitle icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              } label="Securite" />
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button onClick={() => setShowPwd(!showPwd)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A3A6B" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-800">Mot de passe</p>
                      <p className="text-xs text-gray-400">Modifier votre mot de passe</p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                    className={`transition-transform ${showPwd ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {showPwd && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-4">
                    <Field label="Ancien mot de passe" value={oldPwd} onChange={setOldPwd} type="password" />
                    <Field label="Nouveau mot de passe" value={newPwd} onChange={setNewPwd} type="password" />
                    {pwdMsg && <p className="text-sm text-center font-medium text-emerald-600">{pwdMsg}</p>}
                    <button onClick={changerMotDePasse} disabled={savingPwd || !oldPwd || !newPwd}
                      className="w-full bg-[#1A3A6B] text-[#F5C84A] font-bold py-2.5 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors text-sm">
                      {savingPwd ? 'Mise a jour...' : 'Changer le mot de passe'}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* LIENS LEGAUX + DECONNEXION */}
            <section>
              <SectionTitle icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              } label="Informations et compte" />
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
                <MenuRow icon="📄" label="Conditions generales de vente" onClick={() => router.push('/cgv')} />
                <MenuRow icon="🔒" label="Politique de confidentialite" onClick={() => router.push('/confidentialite')} />
                <MenuRow icon="✉️" label="Nous contacter" onClick={() => router.push('/contact')} />
                <MenuRow icon="🚪" label="Se deconnecter" onClick={deconnecter} labelColor="text-gray-700" />
              </div>
            </section>

            {/* SUPPRESSION COMPTE */}
            <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
              <button onClick={() => setShowDelete(!showDelete)}
                className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-red-600">Fermer mon compte</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2"
                  className={`ml-auto transition-transform ${showDelete ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {showDelete && (
                <div className="px-4 pb-4 border-t border-red-50">
                  <p className="text-xs text-gray-500 my-3">Cette action est irreversible. Toutes vos donnees seront supprimees.</p>
                  <button onClick={supprimerCompte}
                    className="w-full bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition-colors text-sm">
                    Confirmer la fermeture du compte
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== ONGLET HOTE ===== */}
        {menu === 'hote' && hostData && (
          <>
            <section>
              <SectionTitle icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              } label="Mes gains" />
              <div className="bg-[#1A3A6B] rounded-2xl p-5 shadow-md overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5C84A]/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="grid grid-cols-3 gap-3 relative">
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#F5C84A]">{totalGagne.toFixed(0)}<span className="text-sm font-bold ml-0.5">€</span></p>
                    <p className="text-white/50 text-[10px] mt-1 font-medium uppercase tracking-wide">Total gagne</p>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <p className="text-2xl font-black text-emerald-400">{balance?.available?.toFixed(0) ?? '—'}<span className="text-sm font-bold ml-0.5">€</span></p>
                    <p className="text-white/50 text-[10px] mt-1 font-medium uppercase tracking-wide">Disponible</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-amber-400">{balance?.pending?.toFixed(0) ?? '—'}<span className="text-sm font-bold ml-0.5">€</span></p>
                    <p className="text-white/50 text-[10px] mt-1 font-medium uppercase tracking-wide">En attente</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              } label="Acces rapides" />
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
                <MenuRow icon="📋" label="Mes reservations" sublabel="Voir et gerer les reservations" onClick={() => router.push('/host/dashboard')} />
                <MenuRow icon="🏦" label="Solde et virements" sublabel="Historique des paiements Stripe" onClick={() => router.push('/host/dashboard')} />
              </div>
            </section>

            <section>
              <SectionTitle icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              } label="Mon point de depot" />
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  <InfoRow icon="📍" label="Ville" value={hostData.ville} />
                  <InfoRow icon="🏦" label="Virements" value={hostData.stripePayoutsEnabled ? 'Actifs' : 'En attente'} valueColor={hostData.stripePayoutsEnabled ? 'text-emerald-600' : 'text-amber-600'} />
                  {hostData.capaciteMax ? <InfoRow icon="🎒" label="Capacite articles" value={`${hostData.capaciteMax} articles max`} /> : null}
                  {hostData.capaciteMaxMoto ? <InfoRow icon="🏍️" label="Capacite motos" value={`${hostData.capaciteMaxMoto} motos max`} /> : null}
                  {hostData.capaciteMaxVelo ? <InfoRow icon="🚲" label="Capacite velos" value={`${hostData.capaciteMaxVelo} velos max`} /> : null}
                </div>
                <div className="p-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${hostData.stripePayoutsEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <p className="text-xs text-gray-500">
                      {hostData.stripePayoutsEnabled
                        ? 'Compte verifie — virements actives via Stripe Connect'
                        : 'Verification en cours via Stripe Connect'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* TELEPHONE HOTE — visible aux clients apres paiement */}
            <section>
              <SectionTitle icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              } label="Telephone de contact" />
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {editTelHote ? (
                  <div className="p-4 space-y-3">
                    <Field label="Telephone" value={telephoneHote} onChange={setTelephoneHote} type="tel" />
                    {telHoteMsg && <p className="text-sm text-center text-emerald-600 font-medium">{telHoteMsg}</p>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditTelHote(false)}
                        className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                        Annuler
                      </button>
                      <button onClick={sauvegarderTelephoneHote} disabled={savingTelHote}
                        className="flex-1 bg-[#1A3A6B] text-[#F5C84A] font-bold py-2.5 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors text-sm">
                        {savingTelHote ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <InfoRow icon="📞" label="Telephone" value={telephoneHote || 'Non renseigne'}
                      valueColor={telephoneHote ? 'text-gray-800' : 'text-amber-600'} />
                    <div className="px-4 py-3 border-t border-gray-50">
                      <button onClick={() => setEditTelHote(true)}
                        className="w-full text-center text-sm font-semibold text-[#1A3A6B] hover:text-[#0C2447] transition-colors py-1">
                        {telephoneHote ? 'Modifier mon telephone' : 'Ajouter mon telephone'}
                      </button>
                    </div>
                  </>
                )}
                {!telephoneHote && !editTelHote && (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      Ce numero sera communique a vos clients apres confirmation de paiement.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
      <NavBar />
    </div>
  )
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2">
      <span className="text-[#1A3A6B]/50">{icon}</span>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function InfoRow({ icon, label, value, valueColor = 'text-gray-800' }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-base flex-shrink-0">{icon}</span>
      <span className="text-sm text-gray-400 flex-1">{label}</span>
      <span className={`text-sm font-semibold ${valueColor} text-right max-w-[55%] truncate`}>{value}</span>
    </div>
  )
}

function MenuRow({ icon, label, sublabel, onClick, labelColor = 'text-gray-800' }: {
  icon: string; label: string; sublabel?: string; onClick: () => void; labelColor?: string
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
      <span className="text-base flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${labelColor}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" className="flex-shrink-0">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] focus:ring-1 focus:ring-[#1A3A6B]/20 transition-all" />
    </div>
  )
}