import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { hostId, ouvert, datesFermeture } = await req.json()

    if (!hostId) {
      return NextResponse.json({ error: 'hostId requis' }, { status: 400 })
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