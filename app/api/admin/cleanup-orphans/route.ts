import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const confirm = req.nextUrl.searchParams.get('confirm') === 'true'

  const snapshot = await adminDb.collection('conversations').get()
  const orphans: { id: string; reason: string; data: any }[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const reasons: string[] = []

    if (!data.hostId) reasons.push('hostId manquant')
    if (!data.clientEmail) reasons.push('clientEmail manquant')

    const messagesSnap = await doc.ref.collection('messages').limit(1).get()
    if (messagesSnap.empty) reasons.push('aucun message')

    if (reasons.length > 0) {
      orphans.push({ id: doc.id, reason: reasons.join(', '), data })
    }
  }

  if (confirm) {
    for (const orphan of orphans) {
      await adminDb.collection('conversations').doc(orphan.id).delete()
    }
    return NextResponse.json({
      deleted: orphans.length,
      ids: orphans.map(o => o.id),
    })
  }

  return NextResponse.json({
    mode: 'dry-run',
    count: orphans.length,
    orphans: orphans.map(o => ({ id: o.id, reason: o.reason, hostNom: o.data.hostNom, clientNom: o.data.clientNom, createdAt: o.data.createdAt })),
  })
}