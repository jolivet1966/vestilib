'use client'
// app/page.tsx — Page de démo VESTILIB MVP
// Montre les deux boutons : onboarding hôte + paiement
import { useState } from 'react'
import OnboardButton from '@/components/OnboardButton'
import PayButton     from '@/components/PayButton'

// ── Hôte de test (à remplacer par un vrai hostId Firestore) ──
const DEMO_HOST_ID = 'REMPLACER_PAR_VRAI_HOST_ID'

export default function DemoPage() {
  const [tab, setTab] = useState<'host' | 'pay'>('host')

  // Champs formulaire hôte
  const [email,  setEmail]  = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom,    setNom]    = useState('')
  const [ville,  setVille]  = useState('')

  // Champs formulaire paiement
  const [hostId,      setHostId]      = useState(DEMO_HOST_ID)
  const [amount,      setAmount]      = useState(10)
  const [description, setDescription] = useState('Consigne VESTILIB')
  const [custEmail,   setCustEmail]   = useState('')

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A3A6B] tracking-widest mb-1">VESTILIB</h1>
          <p className="text-sm text-gray-400">MVP — Stripe Connect + Firebase</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
          <button
            onClick={() => setTab('host')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'host' ? 'bg-[#1A3A6B] text-[#F5C84A]' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            🏠 Onboarding hôte
          </button>
          <button
            onClick={() => setTab('pay')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'pay' ? 'bg-[#635BFF] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            💳 Paiement
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* ── ONBOARDING HÔTE ── */}
          {tab === 'host' && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Créer un compte hôte</h2>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Crée un compte Stripe Connect Express et redirige l'hôte vers le formulaire Stripe.
                Après l'onboarding, le compte sera activé automatiquement via webhook.
              </p>

              <div className="space-y-3 mb-5">
                <Field label="Email *"  value={email}  onChange={setEmail}  placeholder="hote@email.com" type="email" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom *" value={prenom} onChange={setPrenom} placeholder="Jean" />
                  <Field label="Nom *"    value={nom}    onChange={setNom}    placeholder="Dupont" />
                </div>
                <Field label="Ville *"  value={ville}  onChange={setVille}  placeholder="Montpellier" />
              </div>

              <OnboardButton
                email={email}
                prenom={prenom}
                nom={nom}
                ville={ville}
              />

              <div className="mt-5 bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-xs font-medium text-amber-800 mb-2">Ce qui se passe :</p>
                <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>POST <code className="bg-amber-100 px-1 rounded">/api/onboard-host</code></li>
                  <li>Création compte Stripe Connect Express</li>
                  <li>Enregistrement dans Firestore <code className="bg-amber-100 px-1 rounded">hosts/</code></li>
                  <li>Redirection vers formulaire Stripe</li>
                  <li>Webhook <code className="bg-amber-100 px-1 rounded">account.updated</code> → compte activé</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── PAIEMENT ── */}
          {tab === 'pay' && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Créer un paiement</h2>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Crée une session Stripe Checkout avec split automatique 70/30.
                Le client est redirigé vers Stripe puis revient sur <code>/pay/success</code>.
              </p>

              <div className="space-y-3 mb-5">
                <Field label="Host ID (Firestore)" value={hostId} onChange={setHostId} placeholder="abc123..." />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Montant (€) *</label>
                    <input
                      type="number" min={1} step={1}
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B]"
                    />
                  </div>
                  <Field label="Email client" value={custEmail} onChange={setCustEmail} placeholder="client@email.com" type="email" />
                </div>
                <Field label="Description *" value={description} onChange={setDescription} placeholder="Consigne VESTILIB" />
              </div>

              {/* Aperçu du split */}
              <div className="bg-gray-50 rounded-xl p-3 mb-5 flex gap-2">
                <div className="flex-1 bg-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-blue-500 mb-0.5">🏠 Hôte (70%)</p>
                  <p className="text-sm font-semibold text-blue-700">{(amount * 0.7).toFixed(2)}€</p>
                </div>
                <div className="flex-1 bg-orange-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-orange-500 mb-0.5">🏢 VESTILIB (30%)</p>
                  <p className="text-sm font-semibold text-orange-700">{(amount * 0.3).toFixed(2)}€</p>
                </div>
              </div>

              <PayButton
                hostId={hostId}
                amountEuros={amount}
                description={description}
                customerEmail={custEmail || undefined}
                label={`Payer ${amount}€`}
              />

              <div className="mt-5 bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-xs font-medium text-purple-800 mb-2">Ce qui se passe :</p>
                <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>POST <code className="bg-purple-100 px-1 rounded">/api/create-checkout</code></li>
                  <li>Vérification hôte dans Firestore</li>
                  <li>Session Stripe Checkout (<code className="bg-purple-100 px-1 rounded">application_fee_amount</code>)</li>
                  <li>Réservation <code className="bg-purple-100 px-1 rounded">pending</code> créée dans Firestore</li>
                  <li>Redirection vers Stripe → paiement</li>
                  <li>Webhook <code className="bg-purple-100 px-1 rounded">checkout.session.completed</code> → statut <code className="bg-purple-100 px-1 rounded">paid</code></li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Carte de test */}
        <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-600 mb-2">💳 Carte Stripe de test :</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Numéro</p>
              <p className="font-mono font-medium text-gray-800">4242 4242 4242 4242</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Expiration</p>
              <p className="font-mono font-medium text-gray-800">12/26</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">CVC</p>
              <p className="font-mono font-medium text-gray-800">123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A6B] transition-colors"
      />
    </div>
  )
}
