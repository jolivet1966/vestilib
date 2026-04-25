// app/api/create-checkout/route.ts
// ─────────────────────────────────────────────────
// POST /api/create-checkout
//
// Crée une session Stripe Checkout avec split automatique :
//   70% → compte hôte (transfer_data.destination)
//   30% → VESTILIB    (application_fee_amount)
//
// Body attendu :
//   { hostId, amountEuros, description, customerEmail? }
// ─────────────────────────────────────────────────
import { NextRequest, NextResponse }  from 'next/server'
import { createCheckoutSession }      from '@/lib/stripe'
import { adminDb }                    from '@/lib/firebase-admin'
import type { CreateCheckoutInput }   from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: CreateCheckoutInput = await req.json()
    const { hostId, amountEuros, description, customerEmail } = body

    if (!hostId || !amountEuros || !description) {
      return NextResponse.json(
        { error: 'Champs requis : hostId, amountEuros, description' },
        { status: 400 }
      )
    }
    if (amountEuros <= 0) {
      return NextResponse.json(
        { error: 'amountEuros doit être > 0' },
        { status: 400 }
      )
    }

    // 1. Récupérer l'hôte depuis Firestore
    const hostDoc = await adminDb.collection('hosts').doc(hostId).get()
    if (!hostDoc.exists) {
      return NextResponse.json({ error: 'Hôte introuvable' }, { status: 404 })
    }

    const host = hostDoc.data()!
    if (!host.stripeAccountId) {
      return NextResponse.json(
        { error: "Cet hôte n'a pas encore de compte Stripe Connect" },
        { status: 400 }
      )
    }
    if (!host.stripePayoutsEnabled) {
      return NextResponse.json(
        { error: "L'onboarding Stripe de cet hôte n'est pas terminé" },
        { status: 400 }
      )
    }

    // 2. Créer la session Checkout Stripe avec split 70/30
    const { sessionId, url } = await createCheckoutSession({
      hostStripeAccountId: host.stripeAccountId,
      amountEuros,
      description,
      customerEmail,
      metadata: {
        hostId,
        hostEmail: host.email,
        amountEuros: amountEuros.toString(),
      },
    })

    // 3. Créer une réservation "pending" dans Firestore
    const bookingRef = await adminDb.collection('bookings').add({
      hostId,
      stripeCheckoutSessionId: sessionId,
      totalAmount:    amountEuros,
      hostEarns:      parseFloat((amountEuros * 0.7).toFixed(2)),
      vestilibCommission: parseFloat((amountEuros * 0.3).toFixed(2)),
      status:         'pending',
      customerEmail:  customerEmail ?? null,
      createdAt:      new Date(),
    })

    return NextResponse.json({
      success:   true,
      sessionId,
      url,                   // ← rediriger l'utilisateur vers cette URL
      bookingId: bookingRef.id,
    })

  } catch (err: any) {
    console.error('[create-checkout]', err)
    return NextResponse.json(
      { error: err.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
