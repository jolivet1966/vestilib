'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export default function NavBar() {
  const pathname = usePathname()
  const [badgeMessages, setBadgeMessages] = useState(0)
  const [badgeResas, setBadgeResas] = useState(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) return

      // Messages non lus (hôte)
      const msgSnap = await getDocs(query(
        collection(db, 'messages'),
        where('hostId', '==', firebaseUser.uid),
        where('lu', '==', false)
      ))
      setBadgeMessages(msgSnap.size)

      // Demandes de réservation en attente (hôte)
      const resaSnap = await getDocs(query(
        collection(db, 'bookings'),
        where('hostId', '==', firebaseUser.uid),
        where('status', '==', 'awaiting_approval')
      ))
      setBadgeResas(resaSnap.size)
    })
    return () => unsub()
  }, [])

  const actif = (href: string) =>
    pathname === href
      ? 'text-[#F5C84A] bg-[#1A3A6B]'
      : 'text-[#1A3A6B] hover:bg-gray-50'

  const totalBadge = badgeMessages + badgeResas

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
      <div className="max-w-lg mx-auto grid grid-cols-3">

        <Link href="/map" className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors ${actif('/map')}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="text-[10px] font-medium">Rechercher</span>
        </Link>

        <Link href={totalBadge > 0 ? '/host/dashboard' : '/messages'} className={`relative flex flex-col items-center justify-center py-3 gap-1 transition-colors ${actif('/messages')}`}></Link>

          {totalBadge > 0 && (
            <span className="absolute top-2 right-6 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
              {totalBadge}
            </span>
          )}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="text-[10px] font-medium">Messages</span>
        </Link>

        <Link href="/profil" className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors ${actif('/profil')}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="text-[10px] font-medium">Profil</span>
        </Link>

      </div>
    </nav>
  )
}