// types/index.ts

export interface Host {
  id: string
  email: string
  prenom: string
  nom: string
  ville: string
  stripeAccountId: string | null
  stripeOnboardingComplete: boolean
  stripePayoutsEnabled: boolean
  visible: boolean
  createdAt: Date
}

export interface Booking {
  id: string
  bookingCode: string
  hostId: string
  userId: string
  userEmail: string
  totalAmount: number        // en euros
  hostEarns: number          // 70%
  vestilibCommission: number // 30%
  stripePaymentIntentId: string
  stripeCheckoutSessionId?: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  createdAt: Date
}

export interface CreateCheckoutInput {
  hostId: string
  amountEuros: number
  description: string
  customerEmail?: string
}

export interface OnboardHostInput {
  email: string
  prenom: string
  nom: string
  ville: string
}
