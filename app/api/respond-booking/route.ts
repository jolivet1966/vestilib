import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { stripe } from '@/lib/stripe'
import { sendBookingAccepted, sendBookingRefused } from '@/lib/emails'

export async function POST(req: NextRequest) {
  try {
    const { bookingId, action, motifRefus } = await req.json()

    if (!bookingId || !action) {
      return NextResponse.json({ error: 'bookingId et action requis' }, { status: 400 })
    }

    const bookingDoc = await adminDb.collection('bookings').doc(bookingId).get()
    if (!bookingDoc.exists) {
      return NextResponse.json({ error: 'Reservation introuvable' }, { status: 404 })
    }
    const booking = bookingDoc.data()!

    if (booking.status !== 'awaiting_approval') {
      return NextResponse.json({ error: 'Reservation deja traitee' }, { status: 409 })
    }

    const hostDoc = await adminDb.collection('hosts').doc(booking.hostId).get()
    const host = hostDoc.data()!

    if (action === 'refuse') {
      await adminDb.collection('bookings').doc(bookingId).update({
        status: 'refused',
        motifRefus: motifRefus ?? '',
        refusedAt: new Date(),
      })

      await sendBookingRefused({
        to: booking.customerEmail,
        bookingCode: booking.bookingCode,
        hostPrenom: host.prenom,
        hostNom: host.nom,
        date: booking.date,
        creneau: booking.creneau,
        motifRefus: motifRefus ?? '',
      })

      return NextResponse.json({ success: true, action: 'refused' })
    }

    if (action === 'accept') {
      // Creer session Stripe Checkout
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib-z8oc.vercel.app'
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: booking.customerEmail,
        line_items: [{
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(booking.totalAmount * 100),
            product_data: { name: `VESTILIB — ${booking.description}` },
          },
          quantity: 1,
        }],
        success_url: `${appUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${appUrl}/pay/cancel`,
        metadata: {
          bookingId,
          hostId: booking.hostId,
          bookingCode: booking.bookingCode,
        },
        payment_intent_data: {
          transfer_data: { destination: host.stripeAccountId },
          application_fee_amount: Math.round((booking.totalAmount - booking.hostEarns) * 100),
        },
      })

      await adminDb.collection('bookings').doc(bookingId).update({
        status: 'accepted',
        paymentUrl: session.url,
        acceptedAt: new Date(),
        stripeCheckoutSessionId: session.id,
      })

      await sendBookingAccepted({
        to: booking.customerEmail,
        bookingCode: booking.bookingCode,
        hostPrenom: host.prenom,
        hostNom: host.nom,
        hostAdresse: host.adresse,
        hostVille: host.ville,
        date: booking.date,
        creneau: booking.creneau,
        totalAmount: booking.totalAmount,
        paymentUrl: session.url!,
      })

      return NextResponse.json({ success: true, action: 'accepted', paymentUrl: session.url })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })

  } catch (err: any) {
    console.error('[respond-booking]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}