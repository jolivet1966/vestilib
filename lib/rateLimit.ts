// lib/rateLimit.ts
// Limitation simple basee sur l'IP, stockee dans Firestore.
// Retourne { allowed: false } si l'IP a deja soumis une requete
// pour cette route dans la fenetre de temps donnee.
import { adminDb } from '@/lib/firebase-admin'

export async function checkRateLimit(routeKey: string, ip: string, windowSeconds: number) {
  const docId = `${routeKey}_${ip.replace(/[^a-zA-Z0-9.:]/g, '_')}`
  const ref = adminDb.collection('rateLimits').doc(docId)
  const snap = await ref.get()

  const now = Date.now()

  if (snap.exists) {
    const last = snap.data()?.lastRequestAt ?? 0
    const elapsedSeconds = (now - last) / 1000
    if (elapsedSeconds < windowSeconds) {
      return { allowed: false, retryAfterSeconds: Math.ceil(windowSeconds - elapsedSeconds) }
    }
  }

  await ref.set({ lastRequestAt: now })
  return { allowed: true }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}