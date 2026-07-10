// app/api/push/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, title, body, url } = await req.json()

    if (!title || (!userId && !userEmail)) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Récupérer le(s) token(s) FCM
    let tokens: string[] = []

    if (userId) {
      const tokenDoc = await adminDb.collection('pushTokens').doc(userId).get()
      if (tokenDoc.exists && tokenDoc.data()?.token) {
        tokens.push(tokenDoc.data()!.token)
      }
    }

    if (userEmail && tokens.length === 0) {
      const snap = await adminDb
        .collection('pushTokens')
        .where('userEmail', '==', userEmail)
        .limit(1)
        .get()
      if (!snap.empty) {
        tokens.push(snap.docs[0].data().token)
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'Aucun token trouvé' })
    }

    // Envoyer via FCM HTTP v1
    const accessToken = await getAccessToken()

    const results = await Promise.all(tokens.map(token =>
      fetch(`https://fcm.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            webpush: {
              notification: {
                title,
                body,
                icon: '/icon-192.png',
                click_action: url ?? '/',
              },
              fcm_options: { link: url ?? '/' },
            },
          },
        }),
      }).then(r => r.json())
    ))

    console.log('[push] Résultats FCM:', JSON.stringify(results))
    return NextResponse.json({ sent: true, results })

  } catch (err: any) {
    console.error('[push] Erreur:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function getAccessToken(): Promise<string> {
  const { GoogleAuth } = await import('google-auth-library')
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      private_key:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })
  const client = await auth.getClient()
  const tokenResponse = await client.getAccessToken()
  return tokenResponse.token!
}