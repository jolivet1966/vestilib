// app/api/cancel-booking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { bookingId, cancelledBy } = await req.json()

    if (!bookingId || !cancelledBy) {
      return NextResponse.json({ error: 'bookingId et cancelledBy requis' }, { status: 400 })
    }

    const bookingDoc = await adminDb.collection('bookings').doc(bookingId).get()
    if (!bookingDoc.exists) {
      return NextResponse.json({ error: 'Reservation introuvable' }, { status: 404 })
    }

    const booking = bookingDoc.data()!

    // Vérifier que la réservation est annulable
    if (!['authorized', 'accepted', 'awaiting_approval'].includes(booking.status)) {
      return NextResponse.json({ error: 'Cette reservation ne peut pas etre annulee' }, { status: 400 })
    }

    // Vérifier le délai de 48h
    if (booking.date) {
      const datePrestation = new Date(booking.date + 'T00:00:00')
      const maintenant = new Date()
      const diffHeures = (datePrestation.getTime() - maintenant.getTime()) / (1000 * 60 * 60)

      if (diffHeures < 48) {
        return NextResponse.json({
          error: 'Annulation impossible — la prestation est dans moins de 48 heures'
        }, { status: 400 })
      }
    }

    // Annuler le payment intent Stripe si existant
    if (booking.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(booking.stripePaymentIntentId)
      } catch (stripeErr: any) {
        console.error('[cancel-booking] Erreur Stripe:', stripeErr.message)
      }
    }

    // Mettre à jour Firestore
    await bookingDoc.ref.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy,
    })

    // Récupérer les infos pour les emails
    const hostDoc = await adminDb.collection('hosts').doc(booking.hostId).get()
    const host = hostDoc.data()

    // Envoyer emails de notification
    try {
      const { sendCancellationClient, sendCancellationHote } = await import('@/lib/emails')

      if (cancelledBy === 'client' && host?.email) {
        await sendCancellationHote({
          to: host.email,
          hostPrenom: host.prenom,
          bookingCode: booking.bookingCode,
          date: booking.date,
          creneau: booking.creneau,
        })
      }

      if (cancelledBy === 'hote' && booking.customerEmail) {
        await sendCancellationClient({
          to: booking.customerEmail,
          bookingCode: booking.bookingCode,
          date: booking.date,
          creneau: booking.creneau,
        })
      }
    } catch (emailErr: any) {
      console.error('[cancel-booking] Erreur email:', emailErr.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[cancel-booking]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}