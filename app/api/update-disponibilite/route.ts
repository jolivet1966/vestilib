import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const idToken = authHeader.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(idToken)

    const { hostId, ouvert, datesFermeture } = await req.json()

    if (!hostId) {
      return NextResponse.json({ error: 'hostId requis' }, { status: 400 })
    }

    if (decoded.uid !== hostId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    await adminDb.collection('hosts').doc(hostId).update({
      ouvert,
      datesFermeture: datesFermeture ?? [],
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[update-disponibilite]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}