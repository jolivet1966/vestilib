// types/index.ts

// ─── Horaires ─────────────────────────────────────────
export interface JourHoraire {
  ouvert:    boolean
  ouverture: string   // ex: "09:00"
  fermeture: string   // ex: "19:00"
}

export type Horaires = {
  lundi:    JourHoraire
  mardi:    JourHoraire
  mercredi: JourHoraire
  jeudi:    JourHoraire
  vendredi: JourHoraire
  samedi:   JourHoraire
  dimanche: JourHoraire
}

// ─── Onboarding hôte ──────────────────────────────────
export interface OnboardHostInput {
  email:       string
  prenom:      string
  nom:         string
  telephone:   string
  adresse:     string
  codePostal:  string
  ville:       string
  horaires:    Horaires
  prestations: string[]
}

export interface OnboardHostResponse {
  success:         boolean
  hostId:          string
  stripeAccountId: string
  onboardingUrl:   string
}

// ─── Création de checkout ─────────────────────────────
export interface CreateCheckoutInput {
  hostId:         string
  amountEuros:    number
  description:    string
  customerEmail?: string
  date?:          string
  creneau?:       string
  prestations?:   { tarifId: string; quantite: number }[]
}

export interface CreateCheckoutResponse {
  success:   boolean
  sessionId: string
  url:       string
  bookingId: string
}

// ─── Booking (Firestore) ──────────────────────────────
export interface Booking {
  id:                      string
  hostId:                  string
  stripeCheckoutSessionId: string
  stripePaymentIntentId?:  string
  bookingCode?:            string
  totalAmount:             number
  hostEarns:               number
  vestilibCommission:      number
  status:                  'pending' | 'paid' | 'failed'
  customerEmail?:          string | null
  date?:                   string | null
  creneau?:                string | null
  prestations?:            { tarifId: string; quantite: number }[]
  failureMessage?:         string | null
  createdAt:               Date | string
  confirmedAt?:            Date | string
  failedAt?:               Date | string
}

// ─── Hôte (Firestore) ─────────────────────────────────
export interface Host {
  id:                       string
  email:                    string
  prenom:                   string
  nom:                      string
  telephone:                string
  adresse:                  string
  codePostal:               string
  ville:                    string
  horaires:                 Horaires
  prestations:              string[]
  stripeAccountId:          string
  stripeOnboardingComplete: boolean
  stripePayoutsEnabled:     boolean
  visible:                  boolean
  createdAt:                Date | string
}

// ─── Solde hôte ───────────────────────────────────────
export interface HostBalance {
  available:     number
  pending:       number
  currency:      string
  recentPayouts: {
    id:          string
    amount:      number
    status:      string
    arrivalDate: string
  }[]
}