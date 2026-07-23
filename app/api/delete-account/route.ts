import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const idToken = authHeader.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(idToken)
    const uid = decoded.uid
    const email = decoded.email

    if (!email) return NextResponse.json({ error: 'no_email' }, { status: 400 })

    const hostSnap = await adminDb.collection('hosts').doc(uid).get()
    const hostId = hostSnap.exists ? uid : null
    const hostData = hostSnap.exists ? hostSnap.data() : null

    // 1. Reservations en tant que client
    const bookingsClient = await adminDb.collection('bookings').where('customerEmail', '==', email).get()
    for (const d of bookingsClient.docs) await d.ref.delete()

    // 2. Reservations en tant qu'hote
    if (hostId) {
      const bookingsHost = await adminDb.collection('bookings').where('hostId', '==', hostId).get()
      for (const d of bookingsHost.docs) await d.ref.delete()
    }

    // 3. Conversations en tant que client (+ messages)
    const convClient = await adminDb.collection('conversations').where('clientEmail', '==', email).get()
    for (const conv of convClient.docs) {
      const msgs = await conv.ref.collection('messages').get()
      for (const m of msgs.docs) await m.ref.delete()
      await conv.ref.delete()
    }

    // 4. Conversations en tant qu'hote (+ messages)
    if (hostId) {
      const convHost = await adminDb.collection('conversations').where('hostId', '==', hostId).get()
      for (const conv of convHost.docs) {
        const msgs = await conv.ref.collection('messages').get()
        for (const m of msgs.docs) await m.ref.delete()
        await conv.ref.delete()
      }
    }

    // 5. Token de notification push
    try { await adminDb.collection('pushTokens').doc(uid).delete() } catch {}

    // 6. Donnees de versement
    if (hostId && hostData?.stripeAccountId) {
      const payoutsSnap = await adminDb.collection('payouts').where('stripeAccountId', '==', hostData.stripeAccountId).get()
      for (const p of payoutsSnap.docs) await p.ref.delete()
    }

    // 7. Sous-collection privee + compte Stripe Connect + document hote
    if (hostId) {
      const privateSnap = await adminDb.collection('hosts').doc(hostId).collection('private').get()
      for (const p of privateSnap.docs) await p.ref.delete()

      const stripeAccountId = hostData?.stripeAccountId
      if (stripeAccountId) {
        try { await stripe.accounts.del(stripeAccountId) } catch (e) { console.error('Erreur suppression Stripe:', e) }
      }

      await adminDb.collection('hosts').doc(hostId).delete()
    }

    // 8. Document utilisateur
    await adminDb.collection('users').doc(uid).delete()

    // 9. Compte Firebase Authentication
    await adminAuth.deleteUser(uid)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('delete-account error:', e)
    return NextResponse.json({ error: e.message ?? 'erreur' }, { status: 500 })
  }
}