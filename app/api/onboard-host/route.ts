// app/api/onboard-host/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createConnectAccount }      from '@/lib/stripe'
import { adminDb }                   from '@/lib/firebase-admin'
import type { OnboardHostInput }     from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: OnboardHostInput = await req.json()
    const {
      email, prenom, nom, telephone,
      adresse, codePostal, ville,
      horaires, prestations,
    } = body

    // Validation
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

    // 1. Créer le compte Stripe Connect
    const { accountId, onboardingUrl } = await createConnectAccount({
      email, prenom, nom, ville,
    })

    // 2. Enregistrer l'hôte dans Firestore avec tous les champs
    const hostRef = await adminDb.collection('hosts').add({
      email,
      prenom,
      nom,
      telephone,
      adresse,
      codePostal,
      ville,
      horaires,
      prestations,
      stripeAccountId:          accountId,
      stripeOnboardingComplete: false,
      stripePayoutsEnabled:     false,
      visible:                  false,
      createdAt:                new Date(),
    })

    console.log(`[onboard-host] Hôte créé : ${hostRef.id} (${email})`)

    return NextResponse.json({
      success:         true,
      hostId:          hostRef.id,
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