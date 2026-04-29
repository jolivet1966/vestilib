import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const payload   = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    const { constructWebhookEvent } = await import('@/lib/stripe')
    event = constructWebhookEvent(payload, signature)
  } catch (err: any) {
    console.error('[webhook] Signature invalide:', err.message)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    const { adminDb } = await import('@/lib/firebase-admin')

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingCode = 'VST-' + Math.floor(Math.random() * 9000 + 1000)
        const snap = await adminDb.collection('bookings')
          .where('stripeCheckoutSessionId', '==', session.id).limit(1).get()
        if (!snap.empty) {
          await snap.docs[0].ref.update({
            status: 'paid', bookingCode, confirmedAt: new Date(),
            stripePaymentIntentId: session.payment_intent,
          })
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const snap = await adminDb.collection('bookings')
          .where('stripePaymentIntentId', '==', pi.id).limit(1).get()
        if (!snap.empty) {
          await snap.docs[0].ref.update({ status: 'failed', failedAt: new Date() })
        }
        break
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const snap = await adminDb.collection('hosts')
          .where('stripeAccountId', '==', account.id).limit(1).get()
        if (!snap.empty) {
          await snap.docs[0].ref.update({
            stripeOnboardingComplete: account.details_submitted,
            stripePayoutsEnabled: account.payouts_enabled ?? false,
            visible: account.payouts_enabled ?? false,
          })
        }
        break
      }
      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout
        await adminDb.collection('payouts').add({
          stripeAccountId: event.account,
          payoutId: payout.id,
          amount: payout.amount / 100,
          arrivalDate: new Date(payout.arrival_date * 1000),
          status: 'paid',
          createdAt: new Date(),
        })
        break
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}