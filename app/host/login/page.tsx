'use client'
// app/host/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

export default function HostLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Email et mot de passe requis.'); return }
    setLoading(true); setError('')

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/host/dashboard')
    } catch (err: any) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Email ou mot de passe incorrect.')
          break
        case 'auth/too-many-requests':
          setError('Trop de tentatives. Réessayez plus tard.')
          break
        default:
          setError('Erreur de connexion. Vérifiez votre connexion.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1A3A6B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#F5C84A] tracking-widest mb-1">VESTILIB</h1>
          <p className="text-white/50 text-sm">Espace hôte</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Connexion</h2>

          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Pas encore de compte ?{' '}
            <Link href="/host/onboard" className="text-[#1A3A6B] font-medium hover:underline">
              Créer un compte hôte
            </Link>
          </p>
        </div>

        <p className="text-white/30 text-xs text-center mt-6">VESTILIB · Espace hôte sécurisé</p>
      </div>
    </div>
  )
}