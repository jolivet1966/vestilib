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
  const [showLaunchBanner, setShowLaunchBanner] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('compte') === 'supprime') setCompteSuprime(true)
    if (searchParams.get('connecte') === 'true') setConnecte(true)
    if (!localStorage.getItem('vestilib_launch_banner_dismissed')) setShowLaunchBanner(true)
    import('@/lib/firebase').then(({ auth }) => {
      import('firebase/auth').then(({ onAuthStateChanged }) => {
        onAuthStateChanged(auth, user => setIsConnected(!!user))
      })
    })
    const timer = setTimeout(() => setSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  const dismissLaunchBanner = () => {
    localStorage.setItem('vestilib_launch_banner_dismissed', 'true')
    setShowLaunchBanner(false)
  }

  const handlePopupOk = () => {
    setPopup(false)
    router.push('/profil')
  }

  if (splash) return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5C84A]/5 rounded-full -translate-y-20 translate-x-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#F5C84A]/5 rounded-full translate-y-24 -translate-x-24" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-[#F5C84A]/20 rounded-full blur-2xl scale-150" />
          <svg width="120" height="120" viewBox="0 0 44 44" fill="none" className="relative z-10 drop-shadow-2xl">
            <path d="M6 8 L22 36 L38 8" stroke="#F5C84A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M16 8 Q22 4 28 8" stroke="#F5C84A" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <circle cx="22" cy="4" r="2" fill="#F5C84A"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[#F5C84A] font-black text-5xl tracking-[0.3em] drop-shadow-lg">VESTILIB</p>
          <p className="text-white/50 text-sm tracking-[0.2em] mt-2 font-light">POSE · PROFITE · REVIENS</p>
        </div>
        <div className="mt-8 w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#F5C84A] rounded-full" style={{ animation: 'loadbar 2.5s ease-in-out forwards' }} />
        </div>
      </div>
      <style jsx>{`
        @keyframes loadbar { 0% { width: 0% } 100% { width: 100% } }
      `}</style>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans overflow-x-hidden pb-24">

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
            <h2 className="text-base font-bold text-[#1A3A6B] text-center mb-2">Proposer un point de dépôt</h2>
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

      {/* Header compact */}
      <header className="bg-white px-5 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1A3A6B] rounded-lg flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
              <path d="M6 8 L22 36 L38 8" stroke="#F5C84A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M16 8 Q22 4 28 8" stroke="#F5C84A" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <circle cx="22" cy="4" r="2" fill="#F5C84A"/>
            </svg>
          </div>
          <p className="text-[#1A3A6B] font-black text-base tracking-widest">VESTILIB</p>
        </div>
        {!isConnected ? (
          <Link href="/user/login"
            className="text-xs font-semibold text-[#1A3A6B] bg-[#1A3A6B]/5 px-4 py-2 rounded-xl">
            Connexion
          </Link>
        ) : (
          <Link href="/profil"
            className="text-xs font-semibold text-[#1A3A6B] bg-[#1A3A6B]/5 px-4 py-2 rounded-xl">
            Mon profil
          </Link>
        )}
      </header>

      {/* Bandeau lancement */}
      {showLaunchBanner && (
        <div className="bg-[#F5C84A]/15 border-b border-[#F5C84A]/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5">🚀</span>
            <p className="text-xs text-[#0C2447] leading-relaxed flex-1">
              <span className="font-bold">VESTILIB est une nouvelle plateforme en phase de lancement.</span> Nous avons besoin d'un peu de temps pour réunir les premiers hôtes partout en France. Merci de votre patience et de votre confiance !
            </p>
            <button onClick={dismissLaunchBanner}
              className="text-[#0C2447]/40 hover:text-[#0C2447] text-lg leading-none flex-shrink-0 -mt-1">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="px-4 pt-4 pb-6">
        <div className="bg-gradient-to-br from-[#1A3A6B] to-[#0C2447] rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#F5C84A]/10 rounded-full -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-6" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-[#F5C84A]/20 text-[#F5C84A] text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-[#F5C84A] rounded-full"></span>
              Disponible partout en France
            </span>
            <h1 className="text-white font-black text-2xl leading-tight mb-3">
              À la plage ou à la ville,<br/>libérez-vous<br/>de vos affaires.
            </h1>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Déposez casque, sac ou équipement en toute sécurité chez un hôte près de vous.
            </p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[#F5C84A] font-black text-lg">2 min</p>
                <p className="text-white/40 text-[10px]">pour réserver</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[#F5C84A] font-black text-lg">100%</p>
                <p className="text-white/40 text-[10px]">sécurisé</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[#F5C84A] font-black text-lg">0€</p>
                <p className="text-white/40 text-[10px]">d'inscription</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTAs */}
      <section className="px-4 pb-6 space-y-3">
        <Link href="/map"
          className="flex items-center gap-4 w-full bg-[#1A3A6B] px-5 py-4 rounded-2xl shadow-lg shadow-[#1A3A6B]/20 active:scale-95 transition-all">
          <div className="w-10 h-10 bg-[#F5C84A]/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C84A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[#F5C84A] font-bold text-sm">Trouver un point de dépôt</p>
            <p className="text-white/50 text-xs mt-0.5">Voir les hôtes près de vous</p>
          </div>
          <span className="text-white/30 text-xl">›</span>
        </Link>

        <button onClick={() => setPopup(true)}
          className="flex items-center gap-4 w-full bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-sm active:scale-95 transition-all">
          <div className="w-10 h-10 bg-[#1A3A6B]/5 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A3A6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[#1A3A6B] font-bold text-sm">Proposer un point de dépôt</p>
            <p className="text-gray-400 text-xs mt-0.5">Générez des revenus</p>
          </div>
          <span className="text-gray-300 text-xl">›</span>
        </button>
      </section>

      {/* Comment ça marche — timeline */}
      <section className="px-4 pb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">Comment ça marche</p>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {[
            { step: '1', icon: '🔍', titre: 'Trouvez', desc: 'Repérez un point de dépôt sur la carte près de votre destination.', color: 'bg-blue-50 text-blue-600' },
            { step: '2', icon: '📦', titre: 'Déposez', desc: 'Réservez en 30 secondes et déposez vos affaires chez l\'hôte.', color: 'bg-amber-50 text-amber-600' },
            { step: '3', icon: '🎉', titre: 'Profitez', desc: 'Partez les mains libres. Récupérez vos affaires quand vous voulez.', color: 'bg-green-50 text-green-600' },
          ].map((e, i, arr) => (
            <div key={e.step} className={`flex items-start gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                <div className="w-8 h-8 bg-[#1A3A6B] rounded-xl flex items-center justify-center">
                  <span className="text-[#F5C84A] font-black text-xs">{e.step}</span>
                </div>
                {i < arr.length - 1 && <div className="w-px h-6 bg-gray-100" />}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{e.icon}</span>
                  <p className="text-sm font-bold text-[#1A3A6B]">{e.titre}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Avantages — liste horizontale */}
      <section className="px-4 pb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">Pourquoi VESTILIB</p>
        <div className="space-y-2">
          {[
            { icon: '🎒', titre: 'Tout type d\'affaires', desc: 'Casque, sac, vélo, équipement sportif' },
            { icon: '⚡', titre: 'Ultra rapide', desc: 'Réservation confirmée en 30 secondes' },
            { icon: '🤝', titre: 'Hôtes vérifiés', desc: 'Identité validée via Stripe Connect' },
            { icon: '🔒', titre: 'Paiement sécurisé', desc: '100% protégé, remboursement garanti' },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="w-10 h-10 bg-[#1A3A6B] rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                {a.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A3A6B]">{a.titre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 text-center px-5 border-t border-gray-100 bg-white">
        <div className="flex justify-center gap-6 mb-2">
          <Link href="/cgv" className="text-xs text-gray-400 hover:text-gray-600">CGV</Link>
          <Link href="/confidentialite" className="text-xs text-gray-400 hover:text-gray-600">Confidentialité</Link>
        </div>
        <p className="text-gray-300 text-[10px]">© 2026 VESTILIB — Pose. Profite. Reviens.</p>
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