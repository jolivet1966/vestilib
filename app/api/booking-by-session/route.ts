// app/api/booking-by-session/route.ts
// GET /api/booking-by-session?sessionId=cs_xxx
// Récupère la réservation liée à une session Stripe Checkout
import { NextRequest, NextResponse } from 'next/server'
import { adminDb }                   from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId requis' }, { status: 400 })
  }

  try {
    const snap = await adminDb
      .collection('bookings')
      .where('stripeCheckoutSessionId', '==', sessionId)
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ booking: null })
    }

    const doc = snap.docs[0]
    return NextResponse.json({
      booking: { id: doc.id, ...doc.data() },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
