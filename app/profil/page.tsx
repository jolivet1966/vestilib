'use client'
// app/profil/page.tsx — Page profil utilisateur
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import Link from 'next/link'

interface UserData {
  id: string; prenom: string; nom: string; email: string; telephone: string; role: string
}

export default function ProfilPage() {
  const router = useRouter()
  const [menu,     setMenu]     = useState<'apropos' | 'compte'>('apropos')
  const [user,     setUser]     = useState<UserData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editMode, setEditMode] = useState(false)

  const [prenom,    setPrenom]    = useState('')
  const [nom,       setNom]       = useState('')
  const [telephone, setTelephone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg,   setInfoMsg]   = useState('')

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
        // Chercher dans users/
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUser({ id: firebaseUser.uid, ...data } as UserData)
          setPrenom(data.prenom ?? '')
          setNom(data.nom ?? '')
          setTelephone(data.telephone ?? '')
        } else {
          // Pas un utilisateur → rediriger vers dashboard hôte
          router.push('/host/dashboard')
          return
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    })
    return () => unsub()
  }, [router])

  const sauvegarderInfos = async () => {
    if (!user) return
    setSavingInfo(true); setInfoMsg('')
    try {
      await updateDoc(doc(db, 'users', user.id), { prenom, nom, telephone })
      setUser(prev => prev ? { ...prev, prenom, nom, telephone } : null)
      setInfoMsg('✅ Informations mises à jour')
      setEditMode(false)
    } catch { setInfoMsg('❌ Erreur lors de la sauvegarde') }
    finally { setSavingInfo(false) }
  }

  const changerMotDePasse = async () => {
    const firebaseUser = auth.currentUser
    if (!firebaseUser || !firebaseUser.email) return
    setSavingPwd(true); setPwdMsg('')
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, oldPwd)
      await reauthenticateWithCredential(firebaseUser, credential)
      await updatePassword(firebaseUser, newPwd)
      setPwdMsg('✅ Mot de passe mis à jour')
      setOldPwd(''); setNewPwd('')
    } catch (e: any) {
      setPwdMsg(e.code === 'auth/wrong-password' ? '❌ Ancien mot de passe incorrect' : '❌ Erreur : ' + e.message)
    } finally { setSavingPwd(false) }
  }

  const deconnecter = async () => { await signOut(auth); router.push('/') }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return null

  const initiales = `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#1A3A6B] px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="w-16 h-16 bg-[#F5C84A] rounded-full flex items-center justify-center text-[#1A3A6B] text-xl font-black">
            {initiales}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{user.prenom} {user.nom}</p>
            <p className="text-white/50 text-sm">{user.email}</p>
            <span className="text-[10px] bg-[#F5C84A]/20 text-[#F5C84A] px-2 py-0.5 rounded-full">Utilisateur</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex">
          <button onClick={() => setMenu('apropos')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${menu === 'apropos' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400'}`}>
            À propos
          </button>
          <button onClick={() => setMenu('compte')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${menu === 'compte' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400'}`}>
            Compte
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── MENU 1 : À PROPOS ── */}
        {menu === 'apropos' && (
          <>
            {/* Informations personnelles */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informations personnelles</p>
                <button onClick={() => setEditMode(!editMode)}
                  className="text-xs text-[#1A3A6B] font-medium hover:underline">
                  {editMode ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prénom" value={prenom} onChange={setPrenom} />
                    <Field label="Nom" value={nom} onChange={setNom} />
                  </div>
                  <Field label="Téléphone" value={telephone} onChange={setTelephone} type="tel" />
                  {infoMsg && <p className="text-sm text-center">{infoMsg}</p>}
                  <button onClick={sauvegarderInfos} disabled={savingInfo}
                    className="w-full bg-[#1A3A6B] text-[#F5C84A] font-medium py-2.5 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors text-sm">
                    {savingInfo ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <Row label="Nom" value={`${user.prenom} ${user.nom}`} />
                  <Row label="Email" value={user.email} />
                  <Row label="Téléphone" value={user.telephone || '—'} />
                </div>
              )}
            </div>

            {/* Validation profil */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Validation du profil</p>
              <div className="space-y-3">
                <ValidationRow label="Email validé" status={true} info={user.email} />
                <ValidationRow label="Téléphone validé" status={!!user.telephone} info={user.telephone || 'Non renseigné'} />
              </div>
            </div>

            {/* Devenir hôte */}
            <div className="bg-[#1A3A6B]/5 border border-[#1A3A6B]/10 rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A3A6B] mb-2">🏠 Proposer un point de dépôt</p>
              <p className="text-xs text-gray-500 mb-3">Rejoignez le réseau VESTILIB et générez des revenus supplémentaires.</p>
              <Link href="/host/onboard"
                className="block w-full text-center bg-[#1A3A6B] text-[#F5C84A] font-semibold py-2.5 rounded-xl hover:bg-[#0C2447] transition-colors text-sm">
                Créer un compte hôte →
              </Link>
            </div>
          </>
        )}

        {/* ── MENU 2 : COMPTE ── */}
        {menu === 'compte' && (
          <>
            {/* Mes réservations */}
            <MenuCard icon="📋" title="Mes réservations" subtitle="Historique de vos dépôts" onClick={() => router.push('/map')} />

            {/* Avis */}
            <MenuCard icon="⭐" title="Avis" subtitle="Vos évaluations" onClick={() => {}} />

            {/* Mot de passe */}
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
                    {savingPwd ? 'Mise à jour...' : 'Changer le mot de passe'}
                  </button>
                </div>
              )}
            </div>

            {/* CGV */}
            <MenuCard icon="📄" title="Conditions générales" subtitle="CGV VESTILIB" onClick={() => {}} />

            {/* Protection des données */}
            <MenuCard icon="🔒" title="Protection des données" subtitle="Politique de confidentialité" onClick={() => {}} />

            {/* Déconnexion */}
            <button onClick={deconnecter}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors shadow-sm">
              <span className="text-xl">🚪</span>
              <span className="text-sm font-medium text-gray-700">Déconnexion</span>
            </button>

            {/* Fermer mon compte */}
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <button onClick={() => setShowDelete(!showDelete)}
                className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors">
                <span className="text-xl">❌</span>
                <span className="text-sm font-medium text-red-600">Fermer mon compte</span>
              </button>
              {showDelete && (
                <div className="px-5 pb-5 border-t border-red-50">
                  <p className="text-xs text-gray-500 my-3">Cette action est irréversible.</p>
                  <button className="w-full bg-red-600 text-white font-medium py-2.5 rounded-xl hover:bg-red-700 transition-colors text-sm">
                    Confirmer la fermeture du compte
                  </button>
                </div>
              )}
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
          {status ? '✓' : '○'}
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