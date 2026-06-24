'use client'
import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavBar from '@/app/components/NavBar'

function HomeContent() {
  const [splash, setSplash] = useState(true)
  const [popup, setPopup] = useState(false)
  const [compteSuprime, setCompteSuprime] = useState(false)
  const [connecte, setConnecte] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('compte') === 'supprime') setCompteSuprime(true)
    if (searchParams.get('connecte') === 'true') setConnecte(true)
    import('@/lib/firebase').then(({ auth }) => {
      import('firebase/auth').then(({ onAuthStateChanged }) => {
        onAuthStateChanged(auth, user => setIsConnected(!!user))
      })
    })
    const timer = setTimeout(() => setSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  const handlePopupOk = () => {
    setPopup(false)
    router.push('/profil')
  }

  if (splash) return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Cercles décoratifs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5C84A]/5 rounded-full -translate-y-20 translate-x-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#F5C84A]/5 rounded-full translate-y-24 -translate-x-24" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

      {/* Contenu central */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo animé */}
        <div className="relative">
          <div className="absolute inset-0 bg-[#F5C84A]/20 rounded-full blur-2xl scale-150" />
          <svg width="120" height="120" viewBox="0 0 44 44" fill="none" className="relative z-10 drop-shadow-2xl">
            <path d="M6 8 L22 36 L38 8" stroke="#F5C84A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M16 8 Q22 4 28 8" stroke="#F5C84A" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <circle cx="22" cy="4" r="2" fill="#F5C84A"/>
          </svg>
        </div>

        {/* Nom */}
        <div className="text-center">
          <p className="text-[#F5C84A] font-black text-5xl tracking-[0.3em] drop-shadow-lg">VESTILIB</p>
          <p className="text-white/50 text-sm tracking-[0.2em] mt-2 font-light">POSE · PROFITE · REVIENS</p>
        </div>

        {/* Barre de progression */}
        <div className="mt-8 w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#F5C84A] rounded-full animate-[loading_2.5s_ease-in-out_forwards]"
            style={{ animation: 'loading 2.5s ease-in-out forwards' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden pb-24">

      {/* Popup connecté */}
      {connecte && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-base font-bold text-[#1A3A6B] mb-2">Vous êtes connecté !</h2>
            <p className="text-sm text-gray-500 mb-6">Bienvenue sur VESTILIB.</p>
            <button onClick={() => setConnecte(false)}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Popup compte supprimé */}
      {compteSuprime && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-base font-bold text-[#1A3A6B] mb-2">Compte supprimé</h2>
            <p className="text-sm text-gray-500 mb-6">Votre compte a bien été supprimé. Merci d'avoir utilisé VESTILIB.</p>
            <button onClick={() => setCompteSuprime(false)}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Popup proposer un point */}
      {popup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-3xl mb-4 text-center">🏠</div>
            <h2 className="text-base font-bold text-[#1A3A6B] text-center mb-2">
              Proposer un point de dépôt
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              {isConnected
                ? 'Vous êtes connecté. Accédez à votre profil pour devenir hôte.'
                : 'Pour proposer un point de dépôt, connectez-vous ou créez votre compte.'}
            </p>
            <button onClick={handlePopupOk}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
              Accéder à mon profil
            </button>
            <button onClick={() => setPopup(false)}
              className="w-full mt-2 text-gray-400 text-sm py-2 hover:text-gray-600 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A3A6B] rounded-xl flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
              <path d="M6 8 L22 36 L38 8" stroke="#F5C84A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M16 8 Q22 4 28 8" stroke="#F5C84A" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <circle cx="22" cy="4" r="2" fill="#F5C84A"/>
            </svg>
          </div>
          <div>
            <p className="text-[#1A3A6B] font-black text-lg tracking-widest leading-none">VESTILIB</p>
            <p className="text-[#1A3A6B]/50 text-[9px] tracking-wider">Pose. Profite. Reviens.</p>
          </div>
        </div>
        {!isConnected && (
          <Link href="/user/login"
            className="text-xs font-semibold text-[#1A3A6B] border border-[#1A3A6B]/20 px-4 py-2 rounded-xl hover:bg-[#1A3A6B]/5 transition-colors">
            Connexion
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="px-5 pt-4 pb-8">
        {/* Visuel illustratif */}
        <div className="bg-gradient-to-br from-[#1A3A6B] to-[#0C2447] rounded-3xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5C84A]/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#F5C84A]/5 rounded-full translate-y-6 -translate-x-4" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#F5C84A]/20 text-[#F5C84A] text-xs font-semibold px-3 py-1 rounded-full">
                🎉 Disponible partout
              </span>
            </div>
            <p className="text-white font-black text-2xl leading-tight mb-2">
              Libérez-vous<br/>de vos affaires.
            </p>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              Déposez casque, sac ou équipement en toute sécurité chez un hôte près de vous.
            </p>
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-[#F5C84A] font-black text-xl">2 min</p>
                <p className="text-white/50 text-[10px]">pour réserver</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-[#F5C84A] font-black text-xl">100%</p>
                <p className="text-white/50 text-[10px]">sécurisé</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-[#F5C84A] font-black text-xl">0€</p>
                <p className="text-white/50 text-[10px]">d'inscription</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link href="/map"
            className="flex items-center justify-between w-full bg-[#1A3A6B] text-white font-bold px-5 py-4 rounded-2xl hover:bg-[#0C2447] transition-all active:scale-95 shadow-lg shadow-[#1A3A6B]/20">
            <div className="flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div className="text-left">
                <p className="text-sm font-bold text-[#F5C84A]">Trouver un point de dépôt</p>
                <p className="text-xs text-white/50">Voir les hôtes près de vous</p>
              </div>
            </div>
            <span className="text-white/40 text-lg">›</span>
          </Link>

          <button onClick={() => setPopup(true)}
            className="flex items-center justify-between w-full bg-gray-50 border border-gray-100 font-bold px-5 py-4 rounded-2xl hover:bg-gray-100 transition-all active:scale-95">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏠</span>
              <div className="text-left">
                <p className="text-sm font-bold text-[#1A3A6B]">Proposer un point de dépôt</p>
                <p className="text-xs text-gray-400">Générez des revenus</p>
              </div>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="px-5 pb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Comment ça marche</p>
        <div className="space-y-3">
          {[
            { step: '1', icon: '🔍', titre: 'Trouvez', desc: 'Repérez un point de dépôt sur la carte près de votre destination.' },
            { step: '2', icon: '📦', titre: 'Déposez', desc: 'Réservez en 30 secondes et déposez vos affaires chez l\'hôte.' },
            { step: '3', icon: '🎉', titre: 'Profitez', desc: 'Partez les mains libres. Récupérez vos affaires quand vous voulez.' },
          ].map((e) => (
            <div key={e.step} className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="w-9 h-9 bg-[#1A3A6B] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-[#F5C84A] font-black text-sm">{e.step}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span>{e.icon}</span>
                  <p className="text-sm font-bold text-[#1A3A6B]">{e.titre}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Avantages */}
      <section className="bg-[#1A3A6B] mx-4 rounded-3xl py-6 px-5 mb-8">
        <p className="text-xs font-semibold text-[#F5C84A]/60 uppercase tracking-wider mb-4">Pourquoi VESTILIB</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🎒', titre: 'Tout type', desc: 'Casque, sac, vélo, équipement' },
            { icon: '⚡', titre: 'Ultra rapide', desc: 'Réservation en 30 secondes' },
            { icon: '🤝', titre: 'Vérifié', desc: 'Hôtes certifiés Stripe' },
            { icon: '🔒', titre: 'Sécurisé', desc: 'Paiement 100% protégé' },
          ].map((a, i) => (
            <div key={i} className="bg-white/10 rounded-2xl p-4">
              <div className="text-2xl mb-2">{a.icon}</div>
              <p className="text-[#F5C84A] font-bold text-xs mb-1">{a.titre}</p>
              <p className="text-white/50 text-[10px] leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 text-center px-5">
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/cgv" className="text-[10px] text-gray-400 hover:text-gray-600">CGV</Link>
          <span className="text-gray-200">|</span>
          <Link href="/confidentialite" className="text-[10px] text-gray-400 hover:text-gray-600">Confidentialité</Link>
        </div>
        <p className="text-[#1A3A6B]/30 text-[10px]">© 2026 VESTILIB — Pose. Profite. Reviens.</p>
      </footer>

      <NavBar />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}