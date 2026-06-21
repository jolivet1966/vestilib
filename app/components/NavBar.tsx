'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export default function NavBar() {
  const pathname = usePathname()
  const [badge, setBadge] = useState(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) { setBadge(0); return }

      let total = 0

      // Conversations non lues en tant que client
      const clientSnap = await getDocs(query(
        collection(db, 'conversations'),
        where('clientEmail', '==', firebaseUser.email),
        where('luClient', '==', false)
      ))
      total += clientSnap.size

      // Vérifier si hôte
      const hostSnap = await getDocs(query(
        collection(db, 'hosts'),
        where('email', '==', firebaseUser.email)
      ))
      if (!hostSnap.empty) {
        const hostId = hostSnap.docs[0].id

        // Conversations non lues en tant qu'hôte
        const hoteSnap = await getDocs(query(
          collection(db, 'conversations'),
          where('hostId', '==', hostId),
          where('luHote', '==', false)
        ))
        total += hoteSnap.size

        // Demandes de réservation en attente
        const resaSnap = await getDocs(query(
          collection(db, 'bookings'),
          where('hostId', '==', hostId),
          where('status', '==', 'awaiting_approval')
        ))
        total += resaSnap.size
      }

      setBadge(total)
  })

    // Recharger badge toutes les 30 secondes
    const interval = setInterval(async () => {
      const user = (await import('firebase/auth')).getAuth().currentUser
      if (user) {
        // relancer le calcul du badge
        const { getDocs, collection, query, where } = await import('firebase/firestore')
        const { db } = await import('@/lib/firebase')
        let total = 0
        const clientSnap = await getDocs(query(collection(db, 'conversations'), where('clientEmail', '==', user.email), where('luClient', '==', false)))
        total += clientSnap.size
        const hostSnap = await getDocs(query(collection(db, 'hosts'), where('email', '==', user.email)))
        if (!hostSnap.empty) {
          const hId = hostSnap.docs[0].id
          const hoteSnap = await getDocs(query(collection(db, 'conversations'), where('hostId', '==', hId), where('luHote', '==', false)))
          total += hoteSnap.size
          const resaSnap = await getDocs(query(collection(db, 'bookings'), where('hostId', '==', hId), where('status', '==', 'awaiting_approval')))
          total += resaSnap.size
        }
        setBadge(total)
      }
    }, 30000)

    return () => { unsub(); clearInterval(interval) }
  }, [pathname])

  const actif = (href: string) =>
    pathname === href
      ? 'text-[#F5C84A] bg-[#1A3A6B]'
      : 'text-[#1A3A6B] hover:bg-gray-50'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
      <div className="max-w-lg mx-auto grid grid-cols-3">

        <Link href="/map" className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors ${actif('/map')}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="text-[10px] font-medium">Rechercher</span>
        </Link>

        <Link href="/messages" className={`relative flex flex-col items-center justify-center py-3 gap-1 transition-colors ${actif('/messages')}`}>
          {badge > 0 && (
            <span className="absolute top-2 right-6 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
              {badge}
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