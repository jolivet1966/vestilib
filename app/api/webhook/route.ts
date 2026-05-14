// app/api/webhook/route.ts
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

        const snap = await adminDb
          .collection('bookings')
          .where('stripeCheckoutSessionId', '==', session.id)
          .limit(1)
          .get()

        if (!snap.empty) {
          const bookingDoc  = snap.docs[0]
          const bookingData = bookingDoc.data()

          await bookingDoc.ref.update({
            status:                'paid',
            bookingCode,
            confirmedAt:           new Date(),
            stripePaymentIntentId: session.payment_intent ?? null,
          })

          console.log(`[webhook] Booking payé : ${bookingDoc.id} (${bookingCode})`)

          const hostDoc = await adminDb.collection('hosts').doc(bookingData.hostId).get()
          const host    = hostDoc.data()

          try {
            const { sendConfirmationUser, sendNotificationHote } = await import('@/lib/emails')

            if (bookingData.customerEmail && host) {
              await sendConfirmationUser({
                to:          bookingData.customerEmail,
                bookingCode,
                totalAmount: bookingData.totalAmount,
                hostNom:     `${host.prenom} ${host.nom}`,
                hostAdresse: host.adresse ?? '',
                hostVille:   host.ville ?? '',
                date:        bookingData.date ?? null,
                creneau:     bookingData.creneau ?? null,
              })
              console.log(`[webhook] Email utilisateur envoyé à ${bookingData.customerEmail}`)
            }

            if (host?.email) {
              await sendNotificationHote({
                to:            host.email,
                hostPrenom:    host.prenom ?? '',
                bookingCode,
                totalAmount:   bookingData.totalAmount?.toString() ?? '0',
                hostEarns:     bookingData.hostEarns?.toString() ?? '0',
                customerEmail: bookingData.customerEmail ?? null,
                date:          bookingData.date ?? null,
                creneau:       bookingData.creneau ?? null,
              })
              console.log(`[webhook] Email hôte envoyé à ${host.email}`)
            }

          } catch (emailErr: any) {
            console.error('[webhook] Erreur envoi email:', emailErr.message)
          }

        } else {
          console.warn(`[webhook] Aucune booking trouvée pour session ${session.id}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent

        let snap = await adminDb
          .collection('bookings')
          .where('stripePaymentIntentId', '==', pi.id)
          .limit(1)
          .get()

        if (snap.empty && pi.metadata?.hostId) {
          snap = await adminDb
            .collection('bookings')
            .where('hostId', '==', pi.metadata.hostId)
            .where('status', '==', 'pending')
            .limit(1)
            .get()
        }

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            status:                'failed',
            failedAt:              new Date(),
            stripePaymentIntentId: pi.id,
            failureMessage:        pi.last_payment_error?.message ?? null,
          })
          console.log(`[webhook] Paiement échoué : booking ${snap.docs[0].id}`)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account

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
          console.log(`[webhook] Compte hôte mis à jour : ${account.id}`)
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
        console.log(`[webhook] Virement enregistré : ${payout.id}`)
        break
      }

      default:
        console.log(`[webhook] Événement ignoré : ${event.type}`)
    }

  } catch (err: any) {
    console.error('[webhook] Erreur handler:', err.message, err.stack)
    return NextResponse.json({ error: 'Handler error', detail: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}