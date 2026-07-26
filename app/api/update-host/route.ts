import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const idToken = authHeader.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(idToken)

    const body = await req.json()
    const { hostId, horaires, prestations, capaciteMax, capaciteMaxMoto, capaciteMaxVelo, capaciteMaxDepot } = body

    if (!hostId) {
      return NextResponse.json({ error: 'hostId requis' }, { status: 400 })
    }

    if (decoded.uid !== hostId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
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
        error: `Modification impossible : ${reservationsFutures.length} reservation(s) confirmee(s) sur des creneaux futurs.`,
        reservationsFutures: reservationsFutures.length,
      }, { status: 409 })
    }

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

  } catch (err: any) {
    console.error('[update-host]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}