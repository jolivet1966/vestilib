// app/api/onboard-host/check/route.ts
// Vérifie manuellement le statut d'un compte Connect
// (en complément du webhook account.updated)
import { NextRequest, NextResponse } from 'next/server'
import { stripe }                    from '@/lib/stripe'
import { adminDb }                   from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json()
    if (!accountId) return NextResponse.json({ error: 'accountId requis' }, { status: 400 })

    const account = await stripe.accounts.retrieve(accountId)

    // Mettre à jour Firestore
    const snap = await adminDb
      .collection('hosts')
      .where('stripeAccountId', '==', accountId)
      .limit(1)
      .get()

    if (!snap.empty) {
      await snap.docs[0].ref.update({
        stripeOnboardingComplete: account.details_submitted,
        stripePayoutsEnabled:     account.payouts_enabled ?? false,
        visible:                  account.payouts_enabled ?? false,
      })
    }

    return NextResponse.json({
      detailsSubmitted: account.details_submitted,
      payoutsEnabled:   account.payouts_enabled,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
