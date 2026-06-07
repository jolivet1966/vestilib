// app/api/onboard-host/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createConnectAccount }      from '@/lib/stripe'
import { adminDb }                   from '@/lib/firebase-admin'
import type { OnboardHostInput }     from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: OnboardHostInput & { existingUid?: string } = await req.json()
    const {
      email, prenom, nom, telephone,
      adresse, codePostal, ville,
      horaires, prestations,
      existingUid,
      typeCompte = 'individual',
      modeReservation = 'immediat',
      capaciteMax      = 20,
      capaciteMaxMoto  = 5,
      capaciteMaxVelo  = 5,
      capaciteMaxDepot = 10,
    } = body

if (!email || !prenom || !nom || !telephone || !adresse || !codePostal || !ville) {
      return NextResponse.json(
        { error: 'Champs requis : email, prenom, nom, telephone, adresse, codePostal, ville' },
        { status: 400 }
      )
    }
    if (!horaires || !prestations || prestations.length === 0) {
      return NextResponse.json(
        { error: 'Horaires et au moins une prestation sont requis' },
        { status: 400 }
      )
    }

    // 1. Vérifier si un hôte existe déjà avec cet email
    const existingSnap = await adminDb
      .collection('hosts')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: 'Un compte hôte existe déjà pour cet email.' },
        { status: 409 }
      )
    }

    // 2. Créer le compte Stripe Connect
    const { accountId, onboardingUrl } = await createConnectAccount({
  email, prenom, nom, ville, typeCompte,
})
   

    // 3. Enregistrer l'hôte dans Firestore
    const hostData = {
      email,
      prenom,
      nom,
      telephone,
      adresse,
      codePostal,
      ville,
      modeReservation,
      horaires,
      prestations,
      capaciteMax,
      capaciteMaxMoto,
      capaciteMaxVelo,
      capaciteMaxDepot,
      stripeAccountId:          accountId,
      stripeOnboardingComplete: false,
      stripePayoutsEnabled:     false,
      visible:                  false,
      createdAt:                new Date(),
      ...(existingUid ? { uid: existingUid } : {}),
    }

    let hostId: string
    if (existingUid) {
      // Utilisateur déjà connecté → doc hôte avec son uid comme ID
      await adminDb.collection('hosts').doc(existingUid).set(hostData)
      hostId = existingUid
      console.log(`[onboard-host] Hôte lié à user existant : ${existingUid} (${email})`)
    } else {
      // Nouveau visiteur → ID auto
      const hostRef = await adminDb.collection('hosts').add(hostData)
      hostId = hostRef.id
      console.log(`[onboard-host] Nouvel hôte créé : ${hostId} (${email})`)
    }

    return NextResponse.json({
      success:         true,
      hostId,
      stripeAccountId: accountId,
      onboardingUrl,
    })

  } catch (err: any) {
    console.error('[onboard-host]', err)
    return NextResponse.json(
      { error: err.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
