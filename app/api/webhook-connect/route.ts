// app/api/webhook-connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const payload   = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    const { stripe } = await import('@/lib/stripe')
    const secret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT
    if (!secret) {
      console.error('[webhook-connect] STRIPE_WEBHOOK_SECRET_CONNECT manquant')
      return NextResponse.json({ error: 'Config manquante' }, { status: 400 })
    }
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (err: any) {
    console.error('[webhook-connect] Signature invalide:', err.message)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    const { adminDb } = await import('@/lib/firebase-admin')

    switch (event.type) {

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        console.log(`[webhook-connect] account.updated : ${account.id} — payouts_enabled: ${account.payouts_enabled}`)

        const snap = await adminDb
          .collection('hosts')
          .where('stripeAccountId', '==', account.id)
          .limit(1)
          .get()

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            stripeOnboardingComplete: account.details_submitted,
            stripePayoutsEnabled:     account.payouts_enabled ?? false,
            visible:                  account.payouts_enabled ?? false,
          })
          console.log(`[webhook-connect] Compte hote mis a jour : ${account.id} — visible: ${account.payouts_enabled}`)
        } else {
          console.warn(`[webhook-connect] Aucun hote trouve pour stripeAccountId: ${account.id}`)
        }
        break
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout
        await adminDb.collection('payouts').add({
          stripeAccountId: event.account ?? null,
          payoutId:        payout.id,
          amount:          payout.amount / 100,
          arrivalDate:     new Date(payout.arrival_date * 1000),
          status:          'paid',
          createdAt:       new Date(),
        })
        console.log(`[webhook-connect] Virement enregistre : ${payout.id}`)
        break
      }

      default:
        console.log(`[webhook-connect] Evenement ignore : ${event.type}`)
    }

  } catch (err: any) {
    console.error('[webhook-connect] Erreur handler:', err.message)
    return NextResponse.json({ error: 'Handler error', detail: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}