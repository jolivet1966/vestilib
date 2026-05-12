// app/api/hosts/route.ts
// GET /api/hosts — Retourne tous les hôtes visibles (visible: true)
import { NextResponse } from 'next/server'
import { adminDb }      from '@/lib/firebase-admin'

export async function GET() {
  try {
    const snap = await adminDb
      .collection('hosts')
      .where('visible', '==', true)
      .get()

    const hosts = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }))

    return NextResponse.json({ hosts })
  } catch (err: any) {
    console.error('[hosts]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}