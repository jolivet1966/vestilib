'use client'
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function PushInit() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user?.email) return
      try {
        const { initPushNotifications } = await import('@/lib/fcm')
        await initPushNotifications(user.uid, user.email)
      } catch (err) {
        console.error('[PushInit] Erreur:', err)
      }
    })
    return () => unsub()
  }, [])

  return null
}