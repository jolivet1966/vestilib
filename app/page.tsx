'use client'
// app/page.tsx — Page d'accueil VESTILIB avec splash screen
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  // ── SPLASH SCREEN ──
  if (splash) return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center gap-6 animate-fade-in">
      <svg width="80" height="80" viewBox="0 0 44 44" fill="none">
        <path d="M6 8 L22 36 L38 8" stroke="#F5C84A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M16 8 Q22 4 28 8" stroke="#F5C84A" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="4" r="2" fill="#F5C84A"/>
      </svg>
      <p className="text-[#F5C84A] font-black text-3xl tracking-widest">VESTILIB</p>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
      `}</style>
    </div>
  )

  // ── PAGE D'ACCUEIL ──
  return (
    <div className="min-h-screen bg-[#F5C84A] font-sans overflow-x-hidden pb-24">

      {/* ── HEADER ── */}
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path d="M6 8 L22 36 L38 8" stroke="#1A3A6B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M16 8 Q22 4 28 8" stroke="#1A3A6B" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <circle cx="22" cy="4" r="2" fill="#1A3A6B"/>
          </svg>
          <div>
            <p className="text-[#1A3A6B] font-black text-xl tracking-widest leading-none">VESTILIB</p>
            <p className="text-[#1A3A6B]/60 text-[10px] tracking-wider">Pose. Profite. Reviens.</p>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="px-6 pt-8 pb-16 max-w-5xl mx-auto">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-5xl font-black text-[#1A3A6B] leading-tight mb-4">
            Profitez de la plage<br/>
            et de la ville<br/>
            en toute liberté
          </h1>
          <p className="text-[#1A3A6B]/70 text-lg font-medium mb-8 leading-relaxed">
            Casque ? Sac ? Équipement ?<br/>
            Ne vous encombrez plus. Profitez.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/map" className="bg-[#1A3A6B] text-[#F5C84A] font-bold px-8 py-4 rounded-2xl text-base hover:bg-[#0C2447] transition-all hover:scale-105 text-center shadow-lg shadow-[#1A3A6B]/20">
              Trouver un point de dépôt →
            </Link>
            <Link href="/host/onboard" className="bg-white/40 text-[#1A3A6B] font-semibold px-8 py-4 rounded-2xl text-base hover:bg-white/60 transition-colors text-center border border-[#1A3A6B]/20">
              Proposer un point de dépôt
            </Link>
          </div>
        </div>
      </section>

      {/* ── ARGUMENTS ── */}
      <section className="bg-[#1A3A6B] py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🎒', titre: 'Déposez', desc: 'Casque, sac ou équipement en toute sécurité' },
              { icon: '📍', titre: 'À 2 min', desc: 'Des points de dépôt autour de vous' },
              { icon: '🤝', titre: 'De confiance', desc: 'Commerçants & hôtes vérifiés' },
              { icon: '⚡', titre: '30 secondes', desc: 'Simple, rapide, sécurisé' },
            ].map((a, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-5 text-center hover:bg-white/15 transition-colors">
                <div className="text-3xl mb-3">{a.icon}</div>
                <p className="text-[#F5C84A] font-bold text-sm mb-1">{a.titre}</p>
                <p className="text-white/60 text-xs leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
        <div className="max-w-lg mx-auto grid grid-cols-4">
          <Link href="/map" className="flex flex-col items-center justify-center py-3 gap-1 text-[#1A3A6B] hover:bg-gray-50 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="text-[10px] font-medium">Rechercher</span>
          </Link>
          <Link href="/host/onboard" className="flex flex-col items-center justify-center py-3 gap-1 text-[#1A3A6B] hover:bg-gray-50 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="text-[10px] font-medium">Espace hôte</span>
          </Link>
          <Link href="/messages" className="flex flex-col items-center justify-center py-3 gap-1 text-[#1A3A6B] hover:bg-gray-50 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-[10px] font-medium">Messages</span>
          </Link>
          <Link href="/profil" className="flex flex-col items-center justify-center py-3 gap-1 text-[#1A3A6B] hover:bg-gray-50 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-[10px] font-medium">Profil</span>
          </Link>
        </div>
      </nav>

      {/* ── FOOTER ── */}
      <footer className="py-4 text-center">
        <p className="text-[#1A3A6B]/30 text-xs">© 2026 VESTILIB · Pose. Profite. Reviens.</p>
      </footer>
    </div>
  )
}