import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest, { params }: { params: { convId: string } }) {
  try {
    const { role } = await req.json()
    const field = role === 'hote' ? 'luHote' : 'luClient'
    await adminDb.collection('conversations').doc(params.convId).update({ [field]: true })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}