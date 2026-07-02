// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib-z8oc.vercel.app'

async function sendPush(params: { userEmail?: string; userId?: string; title: string; body: string; url?: string }) {
  try {
    await fetch(`${APP_URL}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch (err: any) {
    console.error('[webhook] Erreur push:', err.message)
  }
}

export async function POST(req: NextRequest) {
  const payload   = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    const { stripe } = await import('@/lib/stripe')
    const secret = process.env.STRIPE_WEBHOOK_SECRET!
    const secretConnect = process.env.STRIPE_WEBHOOK_SECRET_CONNECT
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret)
    } catch {
      if (!secretConnect) {
        console.error('[webhook] STRIPE_WEBHOOK_SECRET_CONNECT manquant')
        return NextResponse.json({ error: 'Config manquante' }, { status: 400 })
      }
      event = stripe.webhooks.constructEvent(payload, signature, secretConnect)
    }
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
            status:                'authorized',
            bookingCode,
            authorizedAt:          new Date(),
            stripePaymentIntentId: session.payment_intent ?? null,
          })

          console.log(`[webhook] Booking paye : ${bookingDoc.id} (${bookingCode})`)

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
              console.log(`[webhook] Email utilisateur envoye a ${bookingData.customerEmail}`)
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
              console.log(`[webhook] Email hote envoye a ${host.email}`)
            }
          } catch (emailErr: any) {
            console.error('[webhook] Erreur envoi email:', emailErr.message)
          }

          if (bookingData.customerEmail) {
            await sendPush({
              userEmail: bookingData.customerEmail,
              title: 'Reservation confirmee',
              body:  `Votre reservation ${bookingCode} est confirmee !`,
              url:   `${APP_URL}/profil`,
            })
          }
          if (host?.email) {
            await sendPush({
              userEmail: host.email,
              title: 'Nouvelle reservation',
              body:  `Vous avez recu une nouvelle reservation (${bookingCode}).`,
              url:   `${APP_URL}/host/dashboard`,
            })
          }

        } else {
          console.warn(`[webhook] Aucune booking trouvee pour session ${session.id}`)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session

        const snap = await adminDb
          .collection('bookings')
          .where('stripeCheckoutSessionId', '==', session.id)
          .limit(1)
          .get()

        if (!snap.empty) {
          const bookingData = snap.docs[0].data()
          await snap.docs[0].ref.update({
            status:    'expired',
            expiredAt: new Date(),
          })
          console.log(`[webhook] Session expiree : booking ${snap.docs[0].id}`)

          if (bookingData.customerEmail) {
            await sendPush({
              userEmail: bookingData.customerEmail,
              title: 'Session expiree',
              body:  'Votre session de paiement a expire. Vous pouvez reessayer.',
              url:   `${APP_URL}/map`,
            })
          }
        } else {
          console.warn(`[webhook] Aucune booking trouvee pour session expiree ${session.id}`)
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
          console.log(`[webhook] Paiement echoue : booking ${snap.docs[0].id}`)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account

        // Vérifier d'abord dans hosts_pending
        const pendingSnap = await adminDb
          .collection('hosts_pending')
          .where('stripeAccountId', '==', account.id)
          .limit(1)
          .get()

        if (!pendingSnap.empty && account.payouts_enabled) {
          // Onboarding terminé → migrer vers hosts
          const pendingDoc = pendingSnap.docs[0]
          const hostData = pendingDoc.data()

          const hostId = hostData.uid ?? pendingDoc.id
          await adminDb.collection('hosts').doc(hostId).set({
            ...hostData,
            stripeOnboardingComplete: true,
            stripePayoutsEnabled: true,
            visible: true,
          })
          await pendingDoc.ref.delete()
          console.log(`[webhook] Hôte migré de pending vers hosts : ${hostId}`)
        } else {
          // Hôte déjà dans hosts → mise à jour simple
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
            console.log(`[webhook] Compte hote mis a jour : ${account.id}`)
          }
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
        console.log(`[webhook] Virement enregistre : ${payout.id}`)
        break
      }

      default:
        console.log(`[webhook] Evenement ignore : ${event.type}`)
    }

  } catch (err: any) {
    console.error('[webhook] Erreur handler:', err.message, err.stack)
    return NextResponse.json({ error: 'Handler error', detail: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}