'use client'
// components/PayButton.tsx
// Bouton de paiement → crée une session Checkout Stripe
// et redirige l'utilisateur vers la page de paiement Stripe
import { useState } from 'react'

interface PayButtonProps {
  hostId: string
  amountEuros: number
  description: string
  customerEmail?: string
  label?: string
}

export default function PayButton({
  hostId,
  amountEuros,
  description,
  customerEmail,
  label,
}: PayButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handlePay = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId,
          amountEuros,
          description,
          customerEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du paiement.')
        return
      }

      // Rediriger vers la page Stripe Checkout
      window.location.href = data.url

    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handlePay}
        disabled={loading}
        className="
          bg-[#635BFF] text-white font-medium text-sm
          px-6 py-3 rounded-xl
          hover:bg-[#4F46E5] active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150
          flex items-center justify-center gap-2
        "
      >
        {loading ? (
          <>
            <span className="animate-spin text-base">⏳</span>
            Redirection Stripe...
          </>
        ) : (
          <>
            🔒 {label ?? `Payer ${amountEuros}€`}
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          ⚠ {error}
        </p>
      )}

      <p className="text-xs text-gray-400 text-center">
        Paiement sécurisé · Stripe · PCI-DSS
      </p>
    </div>
  )
}
