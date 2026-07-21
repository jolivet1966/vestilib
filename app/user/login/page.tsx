'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

export default function UserLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const [showReset,   setShowReset]   = useState(false)
  const [resetEmail,  setResetEmail]  = useState('')
  const [resetMsg,    setResetMsg]    = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const connecter = async () => {
    if (!email || !password) { setError('Email et mot de passe requis.'); return }
    setLoading(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      const searchParams = new URLSearchParams(window.location.search)
      const redirect = searchParams.get('redirect') ?? '/?connecte=true'
      router.replace(redirect)
    } catch (err: any) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': setError('Email ou mot de passe incorrect.'); break
        case 'auth/too-many-requests':  setError('Trop de tentatives. Reessayez plus tard.'); break
        default: setError('Erreur de connexion.')
      }
    } finally { setLoading(false) }
  }

  const reinitialiserMotDePasse = async () => {
    if (!resetEmail) { setResetMsg('Veuillez saisir votre email.'); return }
    setResetLoading(true); setResetMsg('')
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setResetMsg('Email envoye ! Verifiez votre boite de reception.')
    } catch (err: any) {
      switch (err.code) {
        case 'auth/user-not-found': setResetMsg('Aucun compte trouve avec cet email.'); break
        case 'auth/invalid-email':  setResetMsg('Email invalide.'); break
        default: setResetMsg('Erreur lors de l envoi.')
      }
    } finally { setResetLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#1E3A8A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#F5C84A] tracking-widest mb-1">VESTILIB</h1>
          <p className="text-white/50 text-sm">{showReset ? 'Reinitialisation du mot de passe' : 'Connexion'}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">

          {!showReset ? (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-5">Se connecter</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="jean@email.com" onKeyDown={e => e.key === 'Enter' && connecter()}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1E3A8A] transition-colors" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500">Mot de passe</label>
                    <button type="button" onClick={() => { setShowReset(true); setResetEmail(email); setResetMsg('') }}
                      className="text-xs text-[#1E3A8A] hover:underline font-medium">
                      Mot de passe oublie ?
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && connecter()}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1E3A8A] transition-colors pr-20" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                      {showPwd ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </div>
              </div>
              {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={connecter} disabled={loading}
                className="mt-5 w-full bg-[#1E3A8A] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-4">
                Pas encore de compte ?{' '}
                <Link href="/user/register" className="text-[#1E3A8A] font-medium hover:underline">S inscrire</Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Mot de passe oublie</h2>
              <p className="text-xs text-gray-400 mb-5">
                Saisissez votre email — nous vous enverrons un lien pour reinitialiser votre mot de passe.
              </p>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  placeholder="jean@email.com"
                  onKeyDown={e => e.key === 'Enter' && reinitialiserMotDePasse()}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1E3A8A] transition-colors" />
              </div>
              {resetMsg && (
                <p className={`mt-3 text-sm rounded-lg px-3 py-2 ${
                  resetMsg.includes('envoye') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}>
                  {resetMsg}
                </p>
              )}
              <button onClick={reinitialiserMotDePasse} disabled={resetLoading}
                className="mt-5 w-full bg-[#1E3A8A] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors">
                {resetLoading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <button onClick={() => { setShowReset(false); setResetMsg('') }}
                className="mt-3 w-full border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Retour a la connexion
              </button>
            </>
          )}
        </div>

        <p className="text-white/20 text-xs text-center mt-6">VESTILIB · Connexion securisee</p>
      </div>
    </div>
  )
}