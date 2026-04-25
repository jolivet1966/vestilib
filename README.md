# VESTILIB MVP — Next.js 14 + Stripe Connect + Firebase

Stack minimal, propre et scalable pour gérer les paiements avec split 70/30.

---

## Structure du projet

```
vestilib-mvp/
├── app/
│   ├── page.tsx                          # Page de démo (boutons onboarding + paiement)
│   ├── layout.tsx
│   ├── globals.css
│   ├── api/
│   │   ├── onboard-host/
│   │   │   ├── route.ts                  # POST — crée compte Stripe Connect
│   │   │   ├── check/route.ts            # POST — vérifie statut onboarding
│   │   │   └── refresh-link/route.ts     # POST — renouvelle lien expiré
│   │   ├── create-checkout/
│   │   │   └── route.ts                  # POST — crée session Checkout (split 70/30)
│   │   ├── webhook/
│   │   │   └── route.ts                  # POST — reçoit événements Stripe
│   │   └── booking-by-session/
│   │       └── route.ts                  # GET  — récupère réservation après paiement
│   ├── pay/
│   │   ├── success/page.tsx              # Retour après paiement réussi
│   │   └── cancel/page.tsx              # Retour après annulation
│   └── host/onboard/
│       ├── success/page.tsx             # Retour après onboarding Stripe
│       └── refresh/page.tsx            # Lien expiré → nouveau lien
├── components/
│   ├── OnboardButton.tsx                # Bouton onboarding hôte
│   └── PayButton.tsx                   # Bouton paiement
├── lib/
│   ├── stripe.ts                       # Toutes les fonctions Stripe (serveur)
│   ├── firebase.ts                     # Firebase client (navigateur)
│   └── firebase-admin.ts              # Firebase Admin (serveur)
├── types/index.ts                      # Types TypeScript partagés
├── .env.example                        # Variables à configurer
└── README.md
```

---

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos vraies clés

# 3. Lancer en développement
npm run dev
# → http://localhost:3000

# 4. Dans un autre terminal — écouter les webhooks Stripe en local
npm run stripe:listen
# (nécessite : npm install -g stripe  puis  stripe login)
```

---

## Configuration Stripe

### 1. Créer un compte Stripe
→ https://stripe.com

### 2. Activer Stripe Connect
→ Dashboard → Connect → Commencer → Choisir **Express**
→ Configurer : France, EUR

### 3. Récupérer les clés API
```
Dashboard → Développeurs → Clés API

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_...
STRIPE_SECRET_KEY                  = sk_test_...
```

### 4. Configurer le Webhook
```
Dashboard → Développeurs → Webhooks → Ajouter un endpoint

URL (production) : https://votre-app.vercel.app/api/webhook
URL (local)      : utiliser "stripe listen" (voir ci-dessus)

Événements à écouter :
  ✓ checkout.session.completed
  ✓ payment_intent.payment_failed
  ✓ account.updated
  ✓ payout.paid

→ Copier le "Signing secret" → STRIPE_WEBHOOK_SECRET
```

### 5. Carte de test
```
Numéro  : 4242 4242 4242 4242
Date    : 12/26
CVC     : 123
```

---

## Configuration Firebase

### 1. Créer un projet
→ https://console.firebase.google.com → Nouveau projet

### 2. Activer Firestore
→ Firestore Database → Créer une base de données → Mode production

### 3. Clés client (NEXT_PUBLIC_*)
→ Paramètres du projet → Vos applications → Config web

### 4. Clés admin (serveur)
→ Paramètres du projet → Comptes de service → Générer une clé privée

### 5. Collections Firestore créées automatiquement
```
hosts/
  {hostId}/
    email, prenom, nom, ville
    stripeAccountId          ← ID compte Connect
    stripeOnboardingComplete ← false → true (webhook)
    stripePayoutsEnabled     ← false → true (webhook)
    visible                  ← false → true (webhook)
    createdAt

bookings/
  {bookingId}/
    hostId
    stripeCheckoutSessionId
    stripePaymentIntentId    ← ajouté après paiement
    bookingCode              ← ajouté après paiement (VST-XXXX)
    totalAmount              ← en euros
    hostEarns                ← 70%
    vestilibCommission       ← 30%
    status                   ← pending → paid | failed
    customerEmail
    createdAt

payouts/
  {payoutId}/
    stripeAccountId
    payoutId, amount, arrivalDate, status
```

### 6. Règles de sécurité Firestore recommandées
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Hôtes : lecture publique, écriture via API uniquement
    match /hosts/{hostId} {
      allow read: if true;
      allow write: if false; // uniquement via API routes
    }
    // Réservations : lecture authentifiée
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    // Virements : admin uniquement
    match /payouts/{payoutId} {
      allow read, write: if false;
    }
  }
}
```

---

## Déploiement sur Vercel

```bash
# Installer la CLI Vercel
npm install -g vercel

# Déployer
vercel

# Ajouter les variables d'environnement dans Vercel
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add FIREBASE_ADMIN_PRIVATE_KEY
# ... (toutes les variables de .env.example)

# Déployer en production
vercel --prod
```

**Important** : après le déploiement, mettre à jour l'URL du webhook Stripe avec votre domaine Vercel.

---

## Flux complet

```
ONBOARDING HÔTE
───────────────
Hôte remplit formulaire
  → POST /api/onboard-host
    → Stripe: stripe.accounts.create() + stripe.accountLinks.create()
    → Firestore: hosts/ { stripeAccountId, visible: false }
    → Retourne: { onboardingUrl }
  → Redirect vers onboardingUrl (formulaire Stripe)
  → Hôte complète le formulaire Stripe
  → Webhook account.updated
    → Firestore: hosts/ { stripePayoutsEnabled: true, visible: true }

PAIEMENT CLIENT
───────────────
Client clique "Payer"
  → POST /api/create-checkout
    → Firestore: récupère stripeAccountId de l'hôte
    → Stripe: stripe.checkout.sessions.create()
        application_fee_amount: 30%  ← VESTILIB
        transfer_data.destination:   ← hôte (70% automatique)
    → Firestore: bookings/ { status: 'pending' }
    → Retourne: { url }
  → Redirect vers url (page Stripe Checkout)
  → Client saisit sa carte
  → Webhook checkout.session.completed
    → Firestore: bookings/ { status: 'paid', bookingCode: 'VST-XXXX' }
  → Redirect vers /pay/success

VIREMENT HÔTE (automatique)
────────────────────────────
  → Le 1er de chaque mois, Stripe vire automatiquement
    les gains de l'hôte (70%) sur son IBAN
  → Webhook payout.paid
    → Firestore: payouts/ { amount, status: 'paid' }
```

---

## Utiliser les composants

```tsx
// Onboarding hôte
import OnboardButton from '@/components/OnboardButton'

<OnboardButton
  email="hote@email.com"
  prenom="Jean"
  nom="Dupont"
  ville="Montpellier"
  onSuccess={(hostId, url) => console.log(hostId, url)}
/>

// Paiement
import PayButton from '@/components/PayButton'

<PayButton
  hostId="abc123"          // ID Firestore de l'hôte
  amountEuros={10}         // Montant total en euros
  description="Consigne"
  customerEmail="client@email.com"
/>
```
