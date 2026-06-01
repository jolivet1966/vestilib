'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import Link from 'next/link'

export default function UserRegisterPage() {
  const router = useRouter()
  const [prenom,    setPrenom]    = useState('')
  const [nom,       setNom]       = useState('')
  const [email,     setEmail]     = useState('')
  const [telephone, setTelephone] = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const inscrire = async () => {
    if (!prenom || !nom || !email || !password) { setError('Tous les champs sont requis.'); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caracteres.'); return }
    if (password !== password2) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true); setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: `${prenom} ${nom}` })
      await setDoc(doc(db, 'users', cred.user.uid), {
        prenom, nom, email, telephone,
        role: 'user',
        createdAt: new Date(),
      })
      router.push('/profil')
    } catch (err: any) {
      switch (err.code) {
        case 'auth/email-already-in-use': setError('Un compte existe deja avec cet email.'); break
        case 'auth/invalid-email':        setError('Email invalide.'); break
        case 'auth/weak-password':        setError('Mot de passe trop faible.'); break
        default: setError('Erreur : ' + err.message)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#1A3A6B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#F5C84A] tracking-widest mb-1">VESTILIB</h1>
          <p className="text-white/50 text-sm">Creer un compte</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Inscription</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prenom" value={prenom} onChange={setPrenom} placeholder="Jean" />
              <Field label="Nom" value={nom} onChange={setNom} placeholder="Dupont" />
            </div>
            <Field label="Email" value={email} onChange={setEmail} placeholder="jean@email.com" type="email" />
            <Field label="Telephone" value={telephone} onChange={setTelephone} placeholder="06 12 34 56 78" type="tel" />
            <Field label="Mot de passe" value={password} onChange={setPassword} placeholder="Min. 6 caracteres" type="password" />
            <Field label="Confirmer" value={password2} onChange={setPassword2} placeholder="Repetez le mot de passe" type="password" />
          </div>
          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={inscrire} disabled={loading}
            className="mt-5 w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
            {loading ? 'Creation...' : 'Creer mon compte'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-4">
            Deja un compte ?{' '}
            <Link href="/user/login" className="text-[#1A3A6B] font-medium hover:underline">Se connecter</Link>
          </p>
        </div>
        <p className="text-white/20 text-xs text-center mt-6">VESTILIB · Inscription securisee</p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors" />
    </div>
  )
}