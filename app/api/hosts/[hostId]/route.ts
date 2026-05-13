// app/api/hosts/[hostId]/route.ts
// GET /api/hosts/[hostId] — Retourne un hôte par son ID
import { NextRequest, NextResponse } from 'next/server'
import { adminDb }                   from '@/lib/firebase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: { hostId: string } }
) {
  try {
    const doc = await adminDb.collection('hosts').doc(params.hostId).get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Hôte introuvable' }, { status: 404 })
    }

    const data = doc.data()!
    return NextResponse.json({
      host: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      }
    })
  } catch (err: any) {
    console.error('[host]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}