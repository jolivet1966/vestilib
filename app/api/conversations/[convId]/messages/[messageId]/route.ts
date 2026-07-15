// app/api/conversations/[convId]/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { convId: string; messageId: string } }
) {
  try {
    const { convId, messageId } = params
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')

    if (!convId || !messageId || !role) {
      return NextResponse.json({ error: 'convId, messageId et role requis' }, { status: 400 })
    }

    const msgRef = adminDb
      .collection('conversations').doc(convId)
      .collection('messages').doc(messageId)

    const msgSnap = await msgRef.get()
    if (!msgSnap.exists) {
      return NextResponse.json({ success: true })
    }

    const hiddenFor: string[] = msgSnap.data()?.hiddenFor ?? []
    const autresRoles = ['client', 'hote'].filter(r => r !== role)
    const dejaMasquePourAutre = autresRoles.some(r => hiddenFor.includes(r))

    if (dejaMasquePourAutre) {
      // L'autre partie a deja masque ce message -> suppression definitive
      await msgRef.delete()
    } else {
      // Masquer seulement pour le demandeur
      await msgRef.update({ hiddenFor: FieldValue.arrayUnion(role) })
    }

    // Nettoyer la conversation si plus aucun message visible pour personne
    const remaining = await adminDb
      .collection('conversations').doc(convId)
      .collection('messages')
      .get()
    const toutesMasqueesPourLesDeux = remaining.docs.every(d => {
      const h = d.data().hiddenFor ?? []
      return h.includes('client') && h.includes('hote')
    })
    if (remaining.empty || toutesMasqueesPourLesDeux) {
      await adminDb.collection('conversations').doc(convId).delete()
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[message DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}