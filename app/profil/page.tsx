'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore'
import Link from 'next/link'

interface UserData {
  id: string; prenom: string; nom: string; email: string; telephone: string
}
interface HostData {
  id: string; prenom: string; nom: string; email: string; ville: string
  stripePayoutsEnabled: boolean; capaciteMax?: number
  capaciteMaxMoto?: number; capaciteMaxVelo?: number
}
interface Balance {
  available: number; pending: number
  recentPayouts: { id: string; amount: number; status: string; arrivalDate: string }[]
}

export default function ProfilPage() {
  const router = useRouter()
  const [menu,      setMenu]      = useState<'utilisateur' | 'hote'>('utilisateur')
  const [userData,  setUserData]  = useState<UserData | null>(null)
  const [hostData,  setHostData]  = useState<HostData | null>(null)
  const [hostId,    setHostId]    = useState<string | null>(null)
  const [balance,   setBalance]   = useState<Balance | null>(null)
  const [totalGagne, setTotalGagne] = useState(0)
  const [mesResas, setMesResas] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  const [editMode,   setEditMode]   = useState(false)
  const [prenom,     setPrenom]     = useState('')
  const [nom,        setNom]        = useState('')
  const [telephone,  setTelephone]  = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg,    setInfoMsg]    = useState('')

  const [showPwd,   setShowPwd]   = useState(false)
  const [oldPwd,    setOldPwd]    = useState('')
  const [newPwd,    setNewPwd]    = useState('')
  const [pwdMsg,    setPwdMsg]    = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

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
        } else {
          const hostSnap = await getDocs(query(
            collection(db, 'hosts'),
            where('email', '==', firebaseUser.email)
          ))
          if (!hostSnap.empty) {
            hostDocData = hostSnap.docs[0].data()
            hostDocId = hostSnap.docs[0].id
          }
        }

        if (hostDocData && hostDocId) {
          setHostData({ id: hostDocId, ...hostDocData } as HostData)
          setHostId(hostDocId)

          const bookSnap = await getDocs(query(
            collection(db, 'bookings'),
            where('hostId', '==', hostDocId)
          ))
          const total = bookSnap.docs
            .filter(d => d.data().status === 'paid')
            .reduce((s, d) => s + (d.data().hostEarns ?? 0), 0)
          setTotalGagne(total)

          const balRes = await fetch(`/api/host-balance?hostId=${hostDocId}`)
          if (balRes.ok) setBalance(await balRes.json())
        }
      // Réservations en cours du client
        const resaSnap = await getDocs(query(
          collection(db, 'bookings'),
          where('customerEmail', '==', firebaseUser.email)
        ))
        const enCours = resaSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((r: any) => ['pending', 'awaiting_approval', 'accepted', 'paid'].includes(r.status))
          .sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds)
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

  const deconnecter = async () => { await signOut(auth); router.push('/') }
  const supprimerCompte = async () => {
  const firebaseUser = auth.currentUser
  if (!firebaseUser || !userData) return
  try {
    await deleteDoc(doc(db, 'users', userData.id))
    await firebaseUser.delete()
    router.push('/')
  } catch (e: any) {
    if (e.code === 'auth/requires-recent-login') {
      alert('Pour des raisons de sécurité, veuillez vous reconnecter avant de supprimer votre compte.')
    } else {
      alert('Erreur lors de la suppression.')
    }
  }
}

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!userData) return null

  const initiales = `${userData.prenom?.[0] ?? ''}${userData.nom?.[0] ?? ''}`.toUpperCase()
  const isHote = !!hostData

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1A3A6B] px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="w-16 h-16 bg-[#F5C84A] rounded-full flex items-center justify-center text-[#1A3A6B] text-xl font-black">
            {initiales}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{userData.prenom} {userData.nom}</p>
            <p className="text-white/50 text-sm">{userData.email}</p>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] bg-[#F5C84A]/20 text-[#F5C84A] px-2 py-0.5 rounded-full">Utilisateur</span>
              {isHote && <span className="text-[10px] bg-green-400/20 text-green-300 px-2 py-0.5 rounded-full">Hote</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex">
          <button onClick={() => setMenu('utilisateur')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${menu === 'utilisateur' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400'}`}>
            Mon profil
          </button>
          {isHote && (
            <button onClick={() => setMenu('hote')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${menu === 'hote' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400'}`}>
              Mon espace hote
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {menu === 'utilisateur' && (
          <>
          {mesResas.length > 0 && (
  <div className="bg-[#F5C84A]/10 border border-[#F5C84A] rounded-2xl p-5 shadow-sm">
    <p className="text-xs font-semibold text-[#1A3A6B] uppercase tracking-wider mb-3">
      🔔 Mes réservations
    </p>
    <div className="space-y-3">
      {mesResas.map((r: any) => (
        <div key={r.id} className="bg-white rounded-xl p-4 border border-[#F5C84A]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono font-bold text-[#1A3A6B] text-sm">{r.bookingCode}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              r.status === 'paid' ? 'bg-green-100 text-green-600' :
              r.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
              r.status === 'awaiting_approval' ? 'bg-yellow-100 text-yellow-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {r.status === 'paid' ? 'Payée' :
               r.status === 'accepted' ? 'Acceptée — paiement en attente' :
               r.status === 'awaiting_approval' ? 'En attente de validation' :
               'En cours'}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            {r.date && <p>📅 {new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
            {r.creneau && <p>🕐 {r.creneau}</p>}
            <p>💶 {r.totalAmount} EUR</p>
            {r.status === 'accepted' && r.paymentUrl && (
              <a href={r.paymentUrl}
                className="mt-2 block w-full text-center bg-[#1A3A6B] text-[#F5C84A] font-semibold py-2 rounded-xl text-xs">
                Payer maintenant
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informations personnelles</p>
                <button onClick={() => setEditMode(!editMode)} className="text-xs text-[#1A3A6B] font-medium hover:underline">
                  {editMode ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prenom" value={prenom} onChange={setPrenom} />
                    <Field label="Nom" value={nom} onChange={setNom} />
                  </div>
                  <Field label="Telephone" value={telephone} onChange={setTelephone} type="tel" />
                  {infoMsg && <p className="text-sm text-center">{infoMsg}</p>}
                  <button onClick={sauvegarderInfos} disabled={savingInfo}
                    className="w-full bg-[#1A3A6B] text-[#F5C84A] font-medium py-2.5 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors text-sm">
                    {savingInfo ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Row label="Nom" value={`${userData.prenom} ${userData.nom}`} />
                  <Row label="Email" value={userData.email} />
                  <Row label="Telephone" value={userData.telephone || '—'} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Validation du profil</p>
              <div className="space-y-3">
                <ValidationRow label="Email valide" status={true} info={userData.email} />
                <ValidationRow label="Telephone valide" status={!!userData.telephone} info={userData.telephone || 'Non renseigne'} />
              </div>
            </div>

            {!isHote && (
              <div className="bg-[#1A3A6B]/5 border border-[#1A3A6B]/10 rounded-2xl p-5">
                <p className="text-sm font-semibold text-[#1A3A6B] mb-2">Proposer un point de depot</p>
                <p className="text-xs text-gray-500 mb-3">Rejoignez le reseau VESTILIB et generez des revenus.</p>
                <Link href="/host/onboard"
                  className="block w-full text-center bg-[#1A3A6B] text-[#F5C84A] font-semibold py-2.5 rounded-xl hover:bg-[#0C2447] transition-colors text-sm">
                  Devenir hote
                </Link>
              </div>
            )}

            

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => setShowPwd(!showPwd)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔑</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">Mot de passe</p>
                    <p className="text-xs text-gray-400">Modifier votre mot de passe</p>
                  </div>
                </div>
                <span className="text-gray-300">{showPwd ? '▲' : '▼'}</span>
              </button>
              {showPwd && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-50">
                  <Field label="Ancien mot de passe" value={oldPwd} onChange={setOldPwd} type="password" />
                  <Field label="Nouveau mot de passe" value={newPwd} onChange={setNewPwd} type="password" />
                  {pwdMsg && <p className="text-sm text-center">{pwdMsg}</p>}
                  <button onClick={changerMotDePasse} disabled={savingPwd || !oldPwd || !newPwd}
                    className="w-full bg-[#1A3A6B] text-[#F5C84A] font-medium py-2.5 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors text-sm">
                    {savingPwd ? 'Mise a jour...' : 'Changer le mot de passe'}
                  </button>
                </div>
              )}
            </div>

            <MenuCard icon="📄" title="Conditions generales" subtitle="CGV VESTILIB" onClick={() => {}} />
            <MenuCard icon="🔒" title="Protection des donnees" subtitle="Politique de confidentialite" onClick={() => {}} />

            <button onClick={deconnecter}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors shadow-sm">
              <span className="text-xl">🚪</span>
              <span className="text-sm font-medium text-gray-700">Deconnexion</span>
            </button>

            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <button onClick={() => setShowDelete(!showDelete)}
                className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors">
                <span className="text-xl">❌</span>
                <span className="text-sm font-medium text-red-600">Fermer mon compte</span>
              </button>
              {showDelete && (
                <div className="px-5 pb-5 border-t border-red-50">
                  <p className="text-xs text-gray-500 my-3">Cette action est irreversible.</p>
                  <button onClick={supprimerCompte} className="w-full bg-red-600 text-white font-medium py-2.5 rounded-xl hover:bg-red-700 transition-colors text-sm">
                    Confirmer la fermeture du compte
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {menu === 'hote' && hostData && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cumul des gains</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-green-50 rounded-xl p-3">
                  <p className="text-xl font-black text-green-600">{totalGagne.toFixed(0)}EUR</p>
                  <p className="text-xs text-gray-400 mt-1">Total gagne</p>
                </div>
                <div className="text-center bg-[#1A3A6B]/5 rounded-xl p-3">
                  <p className="text-xl font-black text-[#1A3A6B]">{balance?.available?.toFixed(0) ?? '—'}EUR</p>
                  <p className="text-xs text-gray-400 mt-1">Disponible</p>
                </div>
                <div className="text-center bg-yellow-50 rounded-xl p-3">
                  <p className="text-xl font-black text-yellow-600">{balance?.pending?.toFixed(0) ?? '—'}EUR</p>
                  <p className="text-xs text-gray-400 mt-1">En attente</p>
                </div>
              </div>
            </div>

            <MenuCard icon="📋" title="Mes reservations" subtitle="Voir toutes les reservations" onClick={() => router.push('/host/dashboard')} />
            <MenuCard icon="🏦" title="Solde et Virements" subtitle="Historique des paiements" onClick={() => router.push('/host/dashboard')} />

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mon point de depot</p>
              <div className="space-y-2">
                <Row label="Ville" value={hostData.ville} />
                <Row label="Virements actives" value={hostData.stripePayoutsEnabled ? 'Oui' : 'En attente'} />
                {hostData.capaciteMax && <Row label="Max articles" value={`${hostData.capaciteMax} articles`} />}
                {hostData.capaciteMaxMoto && <Row label="Max motos" value={`${hostData.capaciteMaxMoto} motos`} />}
                {hostData.capaciteMaxVelo && <Row label="Max velos" value={`${hostData.capaciteMaxVelo} velos`} />}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Statut du compte hote</p>
              <div className="space-y-3">
                <ValidationRow label="Piece d identite" status={hostData.stripePayoutsEnabled} info="Via Stripe Connect" />
                <ValidationRow label="Virements actives" status={hostData.stripePayoutsEnabled} info={hostData.stripePayoutsEnabled ? 'Actif' : 'En attente'} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-gray-700 text-xs font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}

function ValidationRow({ label, status, info }: { label: string; status: boolean; info: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${status ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
          {status ? 'ok' : 'o'}
        </span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-xs text-gray-400">{info}</span>
    </div>
  )
}

function MenuCard({ icon, title, subtitle, onClick }: { icon: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors shadow-sm text-left">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <span className="ml-auto text-gray-300">›</span>
    </button>
  )
}