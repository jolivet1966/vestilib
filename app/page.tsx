'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import NavBar from '@/app/components/NavBar'

export default function HomePage() {
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (splash) return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center gap-6">
      <svg width="80" height="80" viewBox="0 0 44 44" fill="none">
        <path d="M6 8 L22 36 L38 8" stroke="#F5C84A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M16 8 Q22 4 28 8" stroke="#F5C84A" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="4" r="2" fill="#F5C84A"/>
      </svg>
      <p className="text-[#F5C84A] font-black text-3xl tracking-widest">VESTILIB</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden pb-24">

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

      <section className="px-6 pt-8 pb-16 max-w-5xl mx-auto">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-5xl font-black text-[#1A3A6B] leading-tight mb-4">
            Profitez de la plage<br/>
            et de la ville<br/>
            en toute liberte
          </h1>
          <p className="text-[#1A3A6B]/70 text-lg font-medium mb-8 leading-relaxed">
            Casque ? Sac ? Equipement ?<br/>
            Ne vous encombrez plus. Profitez.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/map" className="bg-[#1A3A6B] text-[#F5C84A] font-bold px-8 py-4 rounded-2xl text-base hover:bg-[#0C2447] transition-all hover:scale-105 text-center shadow-lg shadow-[#1A3A6B]/20">
              Trouver un point de depot
            </Link>
            <Link href="/devenir-hote" className="bg-gray-100 text-[#1A3A6B] font-semibold px-8 py-4 rounded-2xl text-base hover:bg-gray-200 transition-colors text-center border border-gray-200">
              Proposer un point de depot
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#1A3A6B] py-14 px-6">
        <div