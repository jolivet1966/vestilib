// app/api/onboard-host/route.ts
// ─────────────────────────────────────────────────
// POST /api/onboard-host
//
// Crée un compte Stripe Connect Express pour un hôte
// et l'enregistre dans Firestore.
// Retourne l'URL d'onboarding Stripe à afficher au front.
// ─────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createConnectAccount }      from '@/lib/stripe'
import { adminDb }                   from '@/lib/firebase-admin'
import type { OnboardHostInput }     from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: OnboardHostInput = await req.json()
    const { email, prenom, nom, ville } = body

    // Validation minimale
    if (!email || !prenom || !nom || !ville) {
      return NextResponse.json(
        { error: 'Champs requis : email, prenom, nom, ville' },
        { status: 400 }
      )
    }

    // 1. Créer le compte Stripe Connect + lien onboarding
    const { accountId, onboardingUrl } = await createConnectAccount({
      email, prenom, nom, ville,
    })

    // 2. Enregistrer l'hôte dans Firestore
    const hostRef = await adminDb.collection('hosts').add({
      email,
      prenom,
      nom,
      ville,
      stripeAccountId:          accountId,
      stripeOnboardingComplete: false,  // → true après webhook account.updated
      stripePayoutsEnabled:     false,  // → true quand Stripe valide le compte
      visible:                  false,  // → true après onboarding complet
      createdAt:                new Date(),
    })

    return NextResponse.json({
      success:       true,
      hostId:        hostRef.id,
      stripeAccountId: accountId,
      onboardingUrl,           // ← rediriger l'hôte vers cette URL
    })

  } catch (err: any) {
    console.error('[onboard-host]', err)
    return NextResponse.json(
      { error: err.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
