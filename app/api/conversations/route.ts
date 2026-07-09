// app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// GET — récupérer les conversations d'un utilisateur
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('hostId')
  const clientEmail = searchParams.get('clientEmail')

  try {
    let snap
    if (hostId) {
      snap = await adminDb.collection('conversations')
        .where('hostId', '==', hostId)
        .orderBy('updatedAt', 'desc')
        .get()
    } else if (clientEmail) {
      snap = await adminDb.collection('conversations')
        .where('clientEmail', '==', clientEmail)
        .orderBy('updatedAt', 'desc')
        .get()
    } else {
      return NextResponse.json({ error: 'hostId ou clientEmail requis' }, { status: 400 })
    }

    const conversations = await Promise.all(snap.docs.map(async d => {
      const data = d.data()
      const msgsSnap = await adminDb.collection('conversations').doc(d.id)
        .collection('messages').orderBy('createdAt', 'desc').limit(1).get()
      const lastMsg = msgsSnap.docs[0]?.data()
      return {
        id: d.id,
        ...data,
        lastMessage: lastMsg?.texte ?? '',
        lastMessageAt: lastMsg?.createdAt ?? data.updatedAt,
      }
    }))

    return NextResponse.json({ conversations })
  } catch (err: any) {
    console.error('[conversations GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — créer ou récupérer une conversation existante
export async function POST(req: NextRequest) {
  try {
    const { hostId, clientEmail, clientNom, texte } = await req.json()

    if (!hostId || !clientEmail || !clientNom || !texte) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
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

    // Chercher conversation existante
    const existing = await adminDb.collection('conversations')
      .where('hostId', '==', hostId)
      .where('clientEmail', '==', clientEmail)
      .limit(1).get()

    let convId: string
    if (!existing.empty) {
      convId = existing.docs[0].id
    } else {
      const hostDoc = await adminDb.collection('hosts').doc(hostId).get()
      const host = hostDoc.data()!
      const newConv = await adminDb.collection('conversations').add({
        hostId,
        hostNom: `${host.prenom} ${host.nom}`,
        clientEmail,
        clientNom,
        createdAt: new Date(),
        updatedAt: new Date(),
        luHote: false,
        luClient: true,
      })
      convId = newConv.id
    }

    // Ajouter le message
    await adminDb.collection('conversations').doc(convId)
      .collection('messages').add({
        texte,
        auteur: 'client',
        clientNom,
        createdAt: new Date(),
      })

    await adminDb.collection('conversations').doc(convId).update({
      updatedAt: new Date(),
      luHote: false,
    })

    // Notifier l'hôte par email
    const hostDoc = await adminDb.collection('hosts').doc(hostId).get()
    const host = hostDoc.data()!
    const hostPrivateDoc = await adminDb.collection('hosts').doc(hostId).collection('private').doc('contact').get()
    const hostPrivate = hostPrivateDoc.data() ?? {}
    const { sendMessageToHote } = await import('@/lib/emails')
    await sendMessageToHote({
      toHote: hostPrivate.email,
      hostPrenom: host.prenom,
      fromNom: clientNom,
      sujet: 'Nouveau message',
      message: texte,
      messageId: convId,
    })

    return NextResponse.json({ success: true, convId })
  } catch (err: any) {
    console.error('[conversations POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}