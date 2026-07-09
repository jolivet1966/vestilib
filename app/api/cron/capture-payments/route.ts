// app/api/cron/capture-payments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Vérifier le token cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const maintenant = new Date()
    const dans48h = new Date(maintenant.getTime() + 48 * 60 * 60 * 1000)

    // Chercher toutes les réservations autorisées dont la date est dans moins de 48h
    const snap = await adminDb.collection('bookings')
      .where('status', '==', 'authorized')
      .get()

    let captured = 0
    let errors = 0

    for (const doc of snap.docs) {
      const booking = doc.data()

      if (!booking.date || !booking.stripePaymentIntentId) continue

      const datePrestation = new Date(booking.date + 'T00:00:00')

      // Si la prestation est dans moins de 48h
      if (datePrestation <= dans48h) {
        try {
          // Capturer le paiement Stripe
          await stripe.paymentIntents.capture(booking.stripePaymentIntentId)

          // Récupérer les coordonnées de l'hôte pour les copier sur la réservation
          const hostDoc = await adminDb.collection('hosts').doc(booking.hostId).get()
          const hostPrivateDoc = await adminDb.collection('hosts').doc(booking.hostId).collection('private').doc('contact').get()
          const host = hostDoc.data()
          const hostPrivate = hostPrivateDoc.data() ?? {}

          // Mettre à jour Firestore
          await doc.ref.update({
            status: 'paid',
            capturedAt: new Date(),
            hostEmail: hostPrivate.email ?? null,
            hostTelephone: hostPrivate.telephone ?? null,
          })

          console.log(`[cron] Paiement capture : ${doc.id} (${booking.bookingCode})`)
          captured++

          // Envoyer email de confirmation
          try {
            const { sendConfirmationUser, sendNotificationHote } = await import('@/lib/emails')
            const bookingCode = booking.bookingCode ?? ''

            if (booking.customerEmail && host) {
              await sendConfirmationUser({
                to: booking.customerEmail,
                bookingCode,
                totalAmount: booking.totalAmount,
                hostNom: `${host.prenom} ${host.nom}`,
                hostAdresse: host.adresse ?? '',
                hostVille: host.ville ?? '',
                date: booking.date ?? null,
                creneau: booking.creneau ?? null,
              })
            }

            if (hostPrivate.email) {
              await sendNotificationHote({
                to: hostPrivate.email,
                hostPrenom: host?.prenom ?? '',
                bookingCode,
                totalAmount: booking.totalAmount?.toString() ?? '0',
                hostEarns: booking.hostEarns?.toString() ?? '0',
                customerEmail: booking.customerEmail ?? null,
                date: booking.date ?? null,
                creneau: booking.creneau ?? null,
              })
            }
          } catch (emailErr: any) {
            console.error('[cron] Erreur email:', emailErr.message)
          }

        } catch (err: any) {
          console.error(`[cron] Erreur capture ${doc.id}:`, err.message)
          errors++
        }
      }
    }

    return NextResponse.json({ success: true, captured, errors })
  } catch (err: any) {
    console.error('[cron]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}