// lib/fcm.ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const VAPID_KEY = 'BImF4fPkGojlV0vGznREfb4st5x-QSvB3Clv8_2dL1gPLo0LOk7TMpq4kkd2QTus9SyMw2-n8wS7vSLNpELQHw'

export async function initPushNotifications(userId: string, userEmail: string) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (!('serviceWorker' in navigator)) return

  try {
    // Demander la permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)

    // Enregistrer le service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    // Récupérer le token FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      // Sauvegarder le token dans Firestore
      await setDoc(doc(db, 'pushTokens', userId), {
        token,
        userId,
        userEmail,
        updatedAt: new Date(),
      }, { merge: true })
    }

    // Gérer les notifications en foreground
    onMessage(messaging, payload => {
      const { title, body } = payload.notification ?? {}
      if (title) {
        new Notification(title, {
          body: body ?? '',
          icon: '/icon-192.png',
        })
      }
    })

  } catch (err) {
    console.error('[FCM] Erreur initialisation push:', err)
  }
}