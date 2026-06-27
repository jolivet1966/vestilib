// app/api/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// GET — récupérer les messages d'une conversation
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')

    const snap = await adminDb.collection('conversations').doc(id)
      .collection('messages').orderBy('createdAt', 'asc').get()

    const messages = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }))

    // Marquer comme lu selon le rôle
    if (role === 'client') {
      await adminDb.collection('conversations').doc(id).update({ luClient: true })
    } else if (role === 'hote') {
      await adminDb.collection('conversations').doc(id).update({ luHote: true })
    }

    return NextResponse.json({ messages })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — envoyer un message dans une conversation
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { texte, auteur, clientNom } = await req.json()

    if (!texte || !auteur) {
      return NextResponse.json({ error: 'texte et auteur requis' }, { status: 400 })
    }

    // Vérifier restrictions coordonnées
    const regexTel = /(\+?\d[\s\-.]?){7,}/
    const regexEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/
    if (regexTel.test(texte) || regexEmail.test(texte)) {
      return NextResponse.json(
        { error: 'Les coordonnées personnelles ne sont pas autorisées avant confirmation de réservation.' },
        { status: 400 }
      )
    }

    const convDoc = await adminDb.collection('conversations').doc(id).get()
    if (!convDoc.exists) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }
    const conv = convDoc.data()!

    // Ajouter le message
    await adminDb.collection('conversations').doc(id)
      .collection('messages').add({
        texte,
        auteur,
        clientNom: clientNom ?? conv.clientNom,
        createdAt: new Date(),
      })

    // Mettre à jour la conversation
    await adminDb.collection('conversations').doc(id).update({
      updatedAt: new Date(),
      luHote: auteur === 'client' ? false : conv.luHote,
      luClient: auteur === 'hote' ? false : conv.luClient,
    })

    // Envoyer notification email
    if (auteur === 'hote') {
      const hostDoc = await adminDb.collection('hosts').doc(conv.hostId).get()
      const host = hostDoc.data()!
      const { sendReponseClient } = await import('@/lib/emails')
      await sendReponseClient({
        to: conv.clientEmail,
        fromPrenom: host.prenom,
        sujet: 'Réponse à votre message',
        reponse: texte,
        hostId: conv.hostId,
      })
    } else {
      const hostDoc = await adminDb.collection('hosts').doc(conv.hostId).get()
      const host = hostDoc.data()!
      const { sendMessageToHote } = await import('@/lib/emails')
      await sendMessageToHote({
        toHote: host.email,
        hostPrenom: host.prenom,
        fromNom: conv.clientNom,
        sujet: 'Nouveau message',
        message: texte,
        messageId: id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[messages POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}