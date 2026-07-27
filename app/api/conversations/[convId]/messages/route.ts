// app/api/conversations/[convId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

// GET — récupérer les messages d'une conversation
export async function GET(req: NextRequest, { params }: { params: { convId: string } }) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const idToken = authHeader.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(idToken)

    const { convId } = params

    const convDocCheck = await adminDb.collection('conversations').doc(convId).get()
    if (!convDocCheck.exists) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }
    const convCheck = convDocCheck.data()!
    let role: string
    if (decoded.uid === convCheck.hostId) {
      role = 'hote'
    } else if (decoded.email === convCheck.clientEmail) {
      role = 'client'
    } else {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const snap = await adminDb.collection('conversations').doc(convId)
      .collection('messages').orderBy('createdAt', 'asc').get()

    const messages = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
      }))
      .filter((m: any) => !(m.hiddenFor ?? []).includes(role))

    // Marquer comme lu selon le rôle
    if (role === 'client') {
      await adminDb.collection('conversations').doc(convId).update({ luClient: true })
    } else if (role === 'hote') {
      await adminDb.collection('conversations').doc(convId).update({ luHote: true })
    }

    return NextResponse.json({ messages })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — envoyer un message dans une conversation
export async function POST(req: NextRequest, { params }: { params: { convId: string } }) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const idToken = authHeader.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(idToken)

    const { convId } = params
    const { texte, clientNom } = await req.json()

    if (!texte) {
      return NextResponse.json({ error: 'texte requis' }, { status: 400 })
    }

    // Vérifier restrictions coordonnées
    const regexTel = /(\+?\d[\s\-.]?){7,}/
    const regexEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/
    if (regexTel.test(texte) || regexEmail.test(texte)) {
      return NextResponse.json(
        { error: 'Les coordonnees personnelles ne sont pas autorisees avant confirmation de reservation.' },
        { status: 400 }
      )
    }

    const convDoc = await adminDb.collection('conversations').doc(convId).get()
    if (!convDoc.exists) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }
    const conv = convDoc.data()!

    let auteur: string
    if (decoded.uid === conv.hostId) {
      auteur = 'hote'
    } else if (decoded.email === conv.clientEmail) {
      auteur = 'client'
    } else {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Ajouter le message
    await adminDb.collection('conversations').doc(convId)
      .collection('messages').add({
        texte,
        auteur,
        clientNom: clientNom ?? conv.clientNom,
        createdAt: new Date(),
      })

    // Mettre à jour la conversation
    await adminDb.collection('conversations').doc(convId).update({
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
        sujet: 'Reponse a votre message',
        reponse: texte,
        hostId: conv.hostId,
      })

      // Notification push au client
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib.fr'
      await fetch(`${APP_URL}/api/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET ?? '' },
        body: JSON.stringify({
          userEmail: conv.clientEmail,
          title: 'Nouveau message',
          body: `${host.prenom} vous a repondu`,
          url: `${APP_URL}/messages`,
        }),
      }).catch(err => console.error('[messages POST] Erreur push client:', err.message))
    } else {
      const hostDoc = await adminDb.collection('hosts').doc(conv.hostId).get()
      const host = hostDoc.data()!
      const hostPrivateDoc = await adminDb.collection('hosts').doc(conv.hostId).collection('private').doc('contact').get()
      const hostPrivate = hostPrivateDoc.data() ?? {}
      const { sendMessageToHote } = await import('@/lib/emails')
      await sendMessageToHote({
        toHote: hostPrivate.email,
        hostPrenom: host.prenom,
        fromNom: conv.clientNom,
        sujet: 'Nouveau message',
        message: texte,
        messageId: convId,
      })

      // Notification push a l'hote
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib.fr'
      await fetch(`${APP_URL}/api/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET ?? '' },
        body: JSON.stringify({
          userEmail: hostPrivate.email,
          title: 'Nouveau message',
          body: `${conv.clientNom} vous a envoye un message`,
          url: `${APP_URL}/host/dashboard`,
        }),
      }).catch(err => console.error('[messages POST] Erreur push hote:', err.message))
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[messages POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}