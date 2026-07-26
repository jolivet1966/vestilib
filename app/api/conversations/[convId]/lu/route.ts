import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function POST(req: NextRequest, { params }: { params: { convId: string } }) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const idToken = authHeader.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(idToken)

    const convDoc = await adminDb.collection('conversations').doc(params.convId).get()
    if (!convDoc.exists) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }
    const conv = convDoc.data()!

    let field: string
    if (decoded.uid === conv.hostId) {
      field = 'luHote'
    } else if (decoded.email === conv.clientEmail) {
      field = 'luClient'
    } else {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    await adminDb.collection('conversations').doc(params.convId).update({ [field]: true })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}