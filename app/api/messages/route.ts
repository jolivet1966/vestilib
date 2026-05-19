// app/api/messages/route.ts
// POST /api/messages — Envoie un message d'un utilisateur à un hôte
import { NextRequest, NextResponse } from 'next/server'
import { adminDb }                   from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hostId, fromEmail, fromNom, sujet, message } = body

    if (!hostId || !fromEmail || !fromNom || !sujet || !message) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    // 1. Récupérer l'hôte
    const hostDoc = await adminDb.collection('hosts').doc(hostId).get()
    if (!hostDoc.exists) {
      return NextResponse.json({ error: 'Hôte introuvable' }, { status: 404 })
    }
    const host = hostDoc.data()!

    // 2. Enregistrer le message dans Firestore
    await adminDb.collection('messages').add({
      hostId,
      fromEmail,
      fromNom,
      sujet,
      message,
      statut: 'envoye',
      createdAt: new Date(),
    })

    // 3. Envoyer les emails
    const { sendMessageToHote, sendConfirmationMessage } = await import('@/lib/emails')

    await sendMessageToHote({
      toHote:     host.email,
      hostPrenom: host.prenom,
      fromEmail,
      fromNom,
      sujet,
      message,
      hostId,
    })

    await sendConfirmationMessage({
      to:             fromEmail,
      nomUtilisateur: fromNom,
      hostPrenom:     host.prenom,
      hostNom:        host.nom,
      sujet,
      message,
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[messages]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}