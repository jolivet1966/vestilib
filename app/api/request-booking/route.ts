import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendNotificationHoteDemandeReservation } from '@/lib/emails'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      hostId, customerEmail, date, creneau,
      prestations, totalAmount, hostEarns, description,
    } = body

    if (!hostId || !customerEmail || !date || !creneau) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Recuperer les infos hote
    const hostDoc = await adminDb.collection('hosts').doc(hostId).get()
    if (!hostDoc.exists) {
      return NextResponse.json({ error: 'Hote introuvable' }, { status: 404 })
    }
    const host = hostDoc.data()!

    // Generer un code de reservation
    const bookingCode = 'VST-' + Math.random().toString(36).substring(2, 8).toUpperCase()

    // Creer la reservation en attente
    const bookingRef = await adminDb.collection('bookings').add({
      hostId,
      bookingCode,
      customerEmail,
      date,
      creneau,
      prestations,
      totalAmount,
      hostEarns,
      description,
      status: 'awaiting_approval',
      createdAt: new Date(),
    })

    // Envoyer email notification a l hote
    await sendNotificationHoteDemandeReservation({
      to: host.email,
      hostPrenom: host.prenom,
      bookingCode,
      bookingId: bookingRef.id,
      customerEmail,
      date,
      creneau,
      totalAmount: totalAmount.toString(),
      description,
    })

    return NextResponse.json({ success: true, bookingId: bookingRef.id, bookingCode })

  } catch (err: any) {
    console.error('[request-booking]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}