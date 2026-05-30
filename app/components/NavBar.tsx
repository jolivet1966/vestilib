'use client'
// app/components/NavBar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function NavBar() {
  const pathname = usePathname()
  const [profilHref, setProfilHref] = useState('/user/login')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { setProfilHref('/user/login'); return }
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      setProfilHref(userDoc.exists() ? '/profil' : '/host/dashboard')
    })
    return () => unsub()
  }, [])

  const actif = (href: string) =>
    pathname === href
      ? 'text-[#F5C84A] bg-[#1A3A6B]'
      : 'text-[#1A3A6B] hover:bg-gray-50'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
      <div className="max-w-lg mx-auto grid grid-cols-4">

        {/* Rechercher */}
        <Link href="/map" className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors rounded-none ${actif('/map')}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="text-[10px] font-medium">Rechercher</span>
        </Link>

        {/* Espace hôte */}
        <Link href="/profil" className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors rounded-none ${actif('/profil') || pathname === '/host/dashboard' ? 'text-[#F5C84A] bg-[#1A3A6B]' : 'text-[#1A3A6B] hover:bg-gray-50'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-[10px] font-medium">Espace hôte</span>
        </Link>

        {/* Messages */}
        <Link href="/messages" className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors rounded-none ${actif('/messages')}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="text-[10px] font-medium">Messages</span>
        </Link>

        {/* Profil */}
        <Link href={profilHref} className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors rounded-none ${pathname === '/profil' || pathname === '/user/login' ? 'text-[#F5C84A] bg-[#1A3A6B]' : 'text-[#1A3A6B] hover:bg-gray-50'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="text-[10px] font-medium">Profil</span>
        </Link>

      </div>
    </nav>
  )
}