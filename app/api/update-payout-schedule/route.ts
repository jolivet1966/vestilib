import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { hostId } = await req.json()

    // Récupérer tous les hôtes ou un hôte spécifique
    let hostDocs
    if (hostId) {
      const doc = await adminDb.collection('hosts').doc(hostId).get()
      hostDocs = doc.exists ? [doc] : []
    } else {
      const snap = await adminDb.collection('hosts').get()
      hostDocs = snap.docs
    }

    const results = []
    for (const doc of hostDocs) {
      const host = doc.data()
      if (!host?.stripeAccountId) continue
      try {
        await stripe.accounts.update(host.stripeAccountId, {
          settings: {
            payouts: {
              schedule: { interval: 'weekly', weekly_anchor: 'monday' },
            },
          },
        })
        results.push({ hostId: doc.id, status: 'ok' })
      } catch (e: any) {
        results.push({ hostId: doc.id, status: 'error', message: e.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}