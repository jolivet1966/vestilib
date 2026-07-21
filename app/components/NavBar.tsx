'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [badge, setBadge] = useState(0)
  const [paiementEnAttente, setPaiementEnAttente] = useState(false)
  const [nouvelleResa, setNouvelleResa] = useState(false)

  useEffect(() => {
    const unsubs: (() => void)[] = []

    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      unsubs.forEach(u => u())
      unsubs.length = 0

      if (!firebaseUser) { setBadge(0); setPaiementEnAttente(false); setNouvelleResa(false); return }

      let clientCount = 0
      let hoteCount = 0
      let resaCount = 0
      let paiementCount = 0
      let nouvelleResaCount = 0

      const updateBadge = () => {
        setBadge(clientCount + hoteCount + resaCount + paiementCount + nouvelleResaCount)
        setPaiementEnAttente(paiementCount > 0)
        setNouvelleResa(nouvelleResaCount > 0)
      }

      const clientUnsub = onSnapshot(
        query(collection(db, 'conversations'),
          where('clientEmail', '==', firebaseUser.email),
          where('luClient', '==', false)
        ),
        snap => { clientCount = snap.size; updateBadge() }
      )
      unsubs.push(clientUnsub)

      const paiementUnsub = onSnapshot(
        query(collection(db, 'bookings'),
          where('customerEmail', '==', firebaseUser.email),
          where('status', '==', 'accepted')
        ),
        snap => { paiementCount = snap.size; updateBadge() }
      )
      unsubs.push(paiementUnsub)

      const { getDoc: gd, doc: d } = await import('firebase/firestore')
      const hostSnap = await gd(d(db, 'hosts', firebaseUser.uid))

      if (hostSnap.exists()) {
        const hostId = hostSnap.id

        const hoteUnsub = onSnapshot(
          query(collection(db, 'conversations'),
            where('hostId', '==', hostId),
            where('luHote', '==', false)
          ),
          snap => { hoteCount = snap.size; updateBadge() }
        )
        unsubs.push(hoteUnsub)

        const resaUnsub = onSnapshot(
          query(collection(db, 'bookings'),
            where('hostId', '==', hostId),
            where('status', '==', 'awaiting_approval')
          ),
          snap => { resaCount = snap.size; updateBadge() }
        )
        unsubs.push(resaUnsub)

        const nouvelleResaUnsub = onSnapshot(
          query(collection(db, 'bookings'),
            where('hostId', '==', hostId),
            where('vuHote', '==', false)
          ),
          snap => {
            nouvelleResaCount = snap.docs.filter(d => ['authorized', 'paid'].includes(d.data().status)).length
            updateBadge()
          }
        )
        unsubs.push(nouvelleResaUnsub)
      }
    })

    return () => { unsub(); unsubs.forEach(u => u()) }
  }, [])

  const actif = (href: string) =>
    pathname === href
      ? 'text-[#F5C84A] bg-[#1A3A6B]'
      : 'text-[#1A3A6B] hover:bg-gray-50'

  const handleMessagesClick = (e: React.MouseEvent) => {
    if (paiementEnAttente) {
      e.preventDefault()
      router.push('/profil')
    } else if (nouvelleResa) {
      e.preventDefault()
      router.push('/host/dashboard')
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-white border-t md:border-t-0 md:border-b border-gray-100 shadow-lg md:shadow-sm z-50">
      <div className="max-w-lg mx-auto grid grid-cols-3 md:max-w-none md:flex md:items-center md:justify-center md:gap-10 md:py-1 md:relative">

        {pathname !== '/' && (
        <Link href="/" className="hidden md:flex items-center gap-2 text-[#1A3A6B] hover:opacity-70 transition-opacity md:absolute md:left-6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          <span className="text-sm font-medium">Accueil</span>
        </Link>
        )}

        <Link href="/map" className={`flex flex-col md:flex-row items-center justify-center py-3 md:py-2 md:px-4 gap-1 md:gap-2 md:rounded-xl transition-colors ${actif('/map')}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="text-[10px] md:text-sm font-medium">Rechercher</span>
        </Link>

        <Link href="/messages" onClick={handleMessagesClick}
          className={`relative flex flex-col md:flex-row items-center justify-center py-3 md:py-2 md:px-4 gap-1 md:gap-2 md:rounded-xl transition-colors ${actif('/messages')}`}>
          {badge > 0 && (
            <span className="absolute top-2 right-6 md:right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
              {badge}
            </span>
          )}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="text-[10px] md:text-sm font-medium">Messages</span>
        </Link>

        <Link href="/profil" className={`flex flex-col md:flex-row items-center justify-center py-3 md:py-2 md:px-4 gap-1 md:gap-2 md:rounded-xl transition-colors ${actif('/profil')}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="text-[10px] md:text-sm font-medium">Profil</span>
        </Link>

      </div>
    </nav>
  )
}