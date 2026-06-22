import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const COMMISSION = parseFloat(process.env.STRIPE_COMMISSION_RATE ?? '0.30')
export async function createConnectAccount(params: {
  email: string
  prenom: string
  nom: string
  ville: string
  typeCompte?: string
}): Promise<{ accountId: string; onboardingUrl: string }> {
  const isCompany = params.typeCompte === 'company'
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      transfers:     { requested: true },
    },
    business_type: isCompany ? 'company' : 'individual',
    ...(!isCompany && {
      individual: {
        first_name: params.prenom,
        last_name:  params.nom,
        address:    { city: params.ville, country: 'FR' },
      },
    }),
    business_profile: {
  mcc: '7011',
  url: 'https://vestilib-z8oc.vercel.app',
  product_description: typeCompte === 'company' ? 'Service de consigne et depot bagages' : 'Non concerne',
},
    settings: {
      payouts: {
        schedule: { interval: 'monthly', monthly_anchor: 1 },
      },
    },
    metadata: {
      vestilib: 'true',
      ville: params.ville,
    },
  })
  const link = await stripe.accountLinks.create({
    account:     account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/host/onboard/refresh?accountId=${account.id}`,
    return_url:  `${process.env.NEXT_PUBLIC_APP_URL}/host/onboard/success?accountId=${account.id}`,
    type: 'account_onboarding',
  })
  return { accountId: account.id, onboardingUrl: link.url }
}

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
    payment_intent_data: {
      application_fee_amount: commissionCents,
      transfer_data: {
        destination: params.hostStripeAccountId,
      },
      metadata: params.metadata ?? {},
    },
    customer_email: params.customerEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pay/cancel`,
    metadata:    params.metadata ?? {},
  })
  return { sessionId: session.id, url: session.url! }
}

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
