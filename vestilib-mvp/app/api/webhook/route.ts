// app/api/webhook/route.ts
// ─────────────────────────────────────────────────
// POST /api/webhook
//
// Reçoit les événements Stripe et met à jour Firestore.
// À configurer dans : dashboard.stripe.com/webhooks
//   URL : https://votre-domaine.vercel.app/api/webhook
//   Événements : checkout.session.completed
//                payment_intent.payment_failed
//                account.updated
//                payout.paid
// ─────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent }     from '@/lib/stripe'
import { adminDb }                   from '@/lib/firebase-admin'
import Stripe                        from 'stripe'

// IMPORTANT : désactiver le body parser Next.js pour Stripe
export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const payload   = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(payload, signature)
  } catch (err: any) {
    console.error('[webhook] Signature invalide:', err.message)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Paiement réussi ────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }

      // ── Paiement échoué ────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(pi)
        break
      }

      // ── Onboarding hôte terminé ────────────────
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      }

      // ── Virement hôte effectué ─────────────────
      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout
        await handlePayoutPaid(payout, event.account!)
        break
      }

      default:
        // Ignorer les autres événements
        break
    }
  } catch (err: any) {
    console.error(`[webhook] Erreur handler ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return

  const hostId = session.metadata?.hostId ?? ''
  const total  = (session.amount_total ?? 0) / 100
  const fee    = (session.payment_intent as any)?.application_fee_amount ?? 0
  const earn   = total - fee / 100

  // Générer code de réservation
  const bookingCode = 'VST-' + Math.floor(Math.random() * 9000 + 1000)

  // Mettre à jour la réservation dans Firestore
  const snap = await adminDb
    .collection('bookings')
    .where('stripeCheckoutSessionId', '==', session.id)
    .limit(1)
    .get()

  if (!snap.empty) {
    await snap.docs[0].ref.update({
      status:          'paid',
      bookingCode,
      confirmedAt:     new Date(),
      stripePaymentIntentId: session.payment_intent,
      hostEarns:       parseFloat(earn.toFixed(2)),
      vestilibCommission: parseFloat((fee / 100).toFixed(2)),
    })
  }

  // Incrémenter les stats de l'hôte
  if (hostId) {
    await adminDb.collection('hosts').doc(hostId).update({
      totalReservations: adminDb.FieldValue ? 
        (adminDb as any).FieldValue.increment(1) : 1,
    })
  }

  console.log(`[webhook] ✅ Paiement confirmé ${bookingCode} — hôte: ${earn}€ — VST: ${fee/100}€`)
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const snap = await adminDb
    .collection('bookings')
    .where('stripePaymentIntentId', '==', pi.id)
    .limit(1)
    .get()

  if (!snap.empty) {
    await snap.docs[0].ref.update({
      status:    'failed',
      failedAt:  new Date(),
      failReason: pi.last_payment_error?.message ?? 'Inconnu',
    })
  }
  console.log(`[webhook] ❌ Paiement échoué: ${pi.id}`)
}

async function handleAccountUpdated(account: Stripe.Account) {
  if (!account.details_submitted) return

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
      activatedAt:              new Date(),
    })
    console.log(`[webhook] ✅ Hôte activé: ${account.id} — payouts: ${account.payouts_enabled}`)
  }
}

async function handlePayoutPaid(payout: Stripe.Payout, stripeAccountId: string) {
  await adminDb.collection('payouts').add({
    stripeAccountId,
    payoutId:    payout.id,
    amount:      payout.amount / 100,
    arrivalDate: new Date(payout.arrival_date * 1000),
    status:      'paid',
    createdAt:   new Date(),
  })
  console.log(`[webhook] 💸 Virement hôte: ${payout.amount / 100}€ → ${stripeAccountId}`)
}
