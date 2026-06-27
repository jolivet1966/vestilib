// app/api/conversations/[convId]/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { convId: string; messageId: string } }
) {
  try {
    const { convId, messageId } = params
    if (!convId || !messageId) {
      return NextResponse.json({ error: 'convId et messageId requis' }, { status: 400 })
    }
    await adminDb
      .collection('conversations').doc(convId)
      .collection('messages').doc(messageId)
      .delete()
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[message DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}