// lib/stripe.ts
// ─────────────────────────────────────────────────
// Toutes les interactions Stripe côté serveur
// ─────────────────────────────────────────────────
import Stripe from 'stripe'

// Instance singleton Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const COMMISSION = parseFloat(process.env.STRIPE_COMMISSION_RATE ?? '0.30')

// ─────────────────────────────────────────────────
// 1. ONBOARDING HÔTE
//    Crée un compte Stripe Connect Express pour l'hôte
//    et retourne l'URL d'onboarding Stripe
// ─────────────────────────────────────────────────
export async function createConnectAccount(params: {
  email: string
  prenom: string
  nom: string
  ville: string
}): Promise<{ accountId: string; onboardingUrl: string }> {
  // Créer le compte Connect Express
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      transfers:     { requested: true },
    },
    business_type: 'individual',
    individual: {
      first_name: params.prenom,
      last_name:  params.nom,
      address:    { city: params.ville, country: 'FR' },
    },
    settings: {
      payouts: {
        // Virement automatique le 1er de chaque mois
        schedule: { interval: 'monthly', monthly_anchor: 1 },
      },
    },
    metadata: {
      vestilib: 'true',
      ville: params.ville,
    },
  })

  // Générer le lien d'onboarding (expire après 24h)
  const link = await stripe.accountLinks.create({
    account:     account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/host/onboard/refresh?accountId=${account.id}`,
    return_url:  `${process.env.NEXT_PUBLIC_APP_URL}/host/onboard/success?accountId=${account.id}`,
    type: 'account_onboarding',
  })

  return { accountId: account.id, onboardingUrl: link.url }
}

// ─────────────────────────────────────────────────
// 2. CRÉER UNE SESSION DE PAIEMENT (Checkout)
//    Split automatique : 70% hôte / 30% VESTILIB
//    via application_fee_amount
// ─────────────────────────────────────────────────
export async function createCheckoutSession(params: {
  hostStripeAccountId: string
  amountEuros: number
  description: string
  customerEmail?: string
  metadata?: Record<string, string>
}): Promise<{ sessionId: string; url: string }> {
  const amountCents     = Math.round(params.amountEuros * 100)
  const commissionCents = Math.round(amountCents * COMMISSION)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency:     'eur',
          product_data: { name: params.description },
          unit_amount:  amountCents,
        },
        quantity: 1,
      },
    ],
    // ── Split 70 / 30 ──────────────────────────
    payment_intent_data: {
      application_fee_amount: commissionCents,      // 30% → VESTILIB
      transfer_data: {
        destination: params.hostStripeAccountId,    // 70% → hôte
      },
      metadata: params.metadata ?? {},
    },
    // ───────────────────────────────────────────
    customer_email: params.customerEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pay/cancel`,
    metadata:    params.metadata ?? {},
  })

  return { sessionId: session.id, url: session.url! }
}

// ─────────────────────────────────────────────────
// 3. VALIDER UN WEBHOOK STRIPE
// ─────────────────────────────────────────────────
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

// ─────────────────────────────────────────────────
// 4. RÉCUPÉRER LE SOLDE D'UN HÔTE
// ─────────────────────────────────────────────────
export async function getHostBalance(stripeAccountId: string) {
  const balance = await stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  })
  const payouts = await stripe.payouts.list(
    { limit: 5 },
    { stripeAccount: stripeAccountId }
  )

  return {
    available: balance.available.reduce((s, b) => s + b.amount, 0) / 100,
    pending:   balance.pending.reduce((s, b) => s + b.amount, 0) / 100,
    currency:  balance.available[0]?.currency ?? 'eur',
    recentPayouts: payouts.data.map(p => ({
      id:          p.id,
      amount:      p.amount / 100,
      status:      p.status,
      arrivalDate: new Date(p.arrival_date * 1000).toLocaleDateString('fr-FR'),
    })),
  }
}
