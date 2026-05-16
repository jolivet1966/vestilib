'use client'
// app/page.tsx — Page d'accueil VESTILIB
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F5C84A] font-sans overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Logo SVG */}
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
        <div className="flex items-center gap-3">
          <Link href="/host/login" className="text-[#1A3A6B] text-sm font-medium hover:underline">
            Espace hôte
          </Link>
          <Link href="/map" className="bg-[#1A3A6B] text-[#F5C84A] text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#0C2447] transition-colors">
            Trouver →
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="px-6 pt-8 pb-16 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-block bg-[#1A3A6B] text-[#F5C84A] text-xs font-bold px-3 py-1.5 rounded-full mb-5 tracking-wider">
              À partir de 4€
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#1A3A6B] leading-tight mb-4">
              Libérez-vous<br/>
              de vos affaires<br/>
              <span className="relative">
                en 30 secondes
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 8" fill="none">
                  <path d="M0 6 Q75 0 150 4 Q225 8 300 2" stroke="#1A3A6B" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p className="text-[#1A3A6B]/80 text-lg font-medium mb-8 leading-relaxed">
              Profitez de la plage et de la ville<br/>en toute liberté
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/map"
                className="bg-[#1A3A6B] text-[#F5C84A] font-bold px-8 py-4 rounded-2xl text-base hover:bg-[#0C2447] transition-all hover:scale-105 text-center shadow-lg shadow-[#1A3A6B]/20"
              >
                Trouver un point de dépôt →
              </Link>
              <Link
                href="/host/onboard"
                className="bg-white/40 text-[#1A3A6B] font-semibold px-8 py-4 rounded-2xl text-base hover:bg-white/60 transition-colors text-center border border-[#1A3A6B]/20"
              >
                Devenir hôte
              </Link>
            </div>
          </div>

          {/* Carte visuelle */}
          <div className="relative hidden md:block">
            <div className="bg-[#1A3A6B] rounded-3xl p-6 text-white shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-[#F5C84A] rounded-full animate-pulse"/>
                <span className="text-xs text-white/60">Points disponibles près de vous</span>
              </div>
              {[
                { ville: 'Montpellier', nb: 3, dist: '0.3 km' },
                { ville: 'La Grande-Motte', nb: 2, dist: '18 km' },
                { ville: 'Palavas-les-Flots', nb: 2, dist: '12 km' },
                { ville: 'Sète', nb: 1, dist: '35 km' },
              ].map((l, i) => (
                <div key={i} className={`flex items-center justify-between py-3 ${i < 3 ? 'border-b border-white/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#F5C84A] rounded-full flex items-center justify-center text-[#1A3A6B] text-xs font-bold">
                      {l.nb}
                    </div>
                    <span className="text-sm font-medium">{l.ville}</span>
                  </div>
                  <span className="text-xs text-white/40">{l.dist}</span>
                </div>
              ))}
              <Link href="/map" className="mt-4 block w-full bg-[#F5C84A] text-[#1A3A6B] font-bold py-2.5 rounded-xl text-sm text-center hover:bg-yellow-300 transition-colors">
                Voir sur la carte →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARGUMENTS ── */}
      <section className="bg-[#1A3A6B] py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-[#F5C84A] font-black text-2xl mb-10">
            Casque ? Sac ? Équipement ?<br/>
            <span className="text-white">Ne vous encombrez plus. Profitez.</span>
          </h2>
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

      {/* ── TARIFS ── */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-[#1A3A6B] font-black text-2xl mb-2">Nos tarifs</h2>
          <p className="text-center text-gray-400 text-sm mb-10">Transparents, sans surprise</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Casque / Sac / Blouson', prix: '4€', duree: '4h' },
              { label: 'Casque / Sac / Blouson', prix: '6€', duree: '8h' },
              { label: 'Douche', prix: '2€', duree: '/pers' },
              { label: 'Parking moto', prix: '5€', duree: '/jour' },
              { label: 'Parking vélo', prix: '4€', duree: '/jour' },
              { label: 'Dépôt 24h (15kg max)', prix: '10€', duree: '/article' },
            ].map((t, i) => (
              <div key={i} className="border border-gray-100 rounded-2xl p-4 text-center hover:border-[#1A3A6B]/20 transition-colors">
                <p className="text-2xl font-black text-[#1A3A6B]">{t.prix}</p>
                <p className="text-xs text-gray-400 mb-1">{t.duree}</p>
                <p className="text-sm text-gray-600 font-medium">{t.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-[#F5C84A]/20 border border-[#F5C84A] rounded-2xl p-4 text-center">
            <p className="text-[#1A3A6B] font-bold text-sm">🎉 Remise automatique de 4€ dès le 4e article !</p>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-[#1A3A6B] py-16 px-6 text-center">
        <h2 className="text-[#F5C84A] font-black text-3xl mb-3">Prêt à vous libérer ?</h2>
        <p className="text-white/60 text-sm mb-8">Trouvez un vestiaire en 30 secondes</p>
        <Link
          href="/map"
          className="inline-block bg-[#F5C84A] text-[#1A3A6B] font-black px-10 py-4 rounded-2xl text-lg hover:bg-yellow-300 transition-all hover:scale-105 shadow-lg"
        >
          Trouver un vestiaire près de moi →
        </Link>
        <div className="mt-10 pt-8 border-t border-white/10 flex justify-center gap-6">
          <Link href="/host/onboard" className="text-white/40 text-xs hover:text-white/70 transition-colors">Devenir hôte</Link>
          <Link href="/host/login" className="text-white/40 text-xs hover:text-white/70 transition-colors">Espace hôte</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0C2447] py-4 text-center">
        <p className="text-white/20 text-xs">© 2026 VESTILIB · Pose. Profite. Reviens.</p>
      </footer>
    </div>
  )
}