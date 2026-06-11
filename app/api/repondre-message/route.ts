import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { messageId, reponse } = await req.json()

    if (!messageId || !reponse) {
      return NextResponse.json({ error: 'messageId et reponse requis' }, { status: 400 })
    }

    // Récupérer le message
    const msgDoc = await adminDb.collection('messages').doc(messageId).get()
    if (!msgDoc.exists) {
      return NextResponse.json({ error: 'Message introuvable' }, { status: 404 })
    }
    const msg = msgDoc.data()!

    // Récupérer l'hôte
    const hostDoc = await adminDb.collection('hosts').doc(msg.hostId).get()
    const host = hostDoc.data()!

    // Vérifier restriction coordonnées
    const regexTel = /(\+?\d[\s\-.]?){7,}/
    const regexEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/
    if (regexTel.test(reponse) || regexEmail.test(reponse)) {
      return NextResponse.json(
        { error: 'Les coordonnées personnelles ne sont pas autorisées avant confirmation de réservation.' },
        { status: 400 }
      )
    }

    // Sauvegarder la réponse dans Firestore
    await adminDb.collection('messages').doc(messageId).update({
      reponse,
      reponduAt: new Date(),
      lu: true,
    })

    // Envoyer email au client
    const { sendReponseClient } = await import('@/lib/emails')
    await sendReponseClient({
      to: msg.fromEmail,
      fromPrenom: host.prenom,
      sujet: msg.sujet,
      reponse,
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[repondre-message]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}