import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hostId, horaires, prestations, capaciteMax, capaciteMaxMoto, capaciteMaxVelo, capaciteMaxDepot } = body

    if (!hostId) {
      return NextResponse.json({ error: 'hostId requis' }, { status: 400 })
    }

    // Verifier si des reservations payees futures existent
    const now = new Date().toISOString().split('T')[0]
    const bookSnap = await adminDb
      .collection('bookings')
      .where('hostId', '==', hostId)
      .where('status', '==', 'paid')
      .get()

    const reservationsFutures = bookSnap.docs.filter(d => {
      const date = d.data().date
      return date && date >= now
    })

    if (reservationsFutures.length > 0) {
      return NextResponse.json({
        error: `Modification impossible : ${reservationsFutures.length} reservation(s) confirmee(s) sur des creneaux futurs. Contactez vos clients avant de modifier vos services.`,
        reservationsFutures: reservationsFutures.length,
      }, { status: 409 })
    }

    // Mettre a jour le document hote
    await adminDb.collection('hosts').doc(hostId).update({
      horaires,
      prestations,
      capaciteMax:      capaciteMax      ?? 20,
      capaciteMaxMoto:  capaciteMaxMoto  ?? 5,
      capaciteMaxVelo:  capaciteMaxVelo  ?? 5,
      capaciteMaxDepot: capaciteMaxDepot ?? 10,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })