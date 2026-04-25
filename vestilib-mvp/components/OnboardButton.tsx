'use client'
// components/OnboardButton.tsx
// Bouton d'onboarding hôte → redirige vers Stripe Connect
import { useState } from 'react'

interface OnboardButtonProps {
  email: string
  prenom: string
  nom: string
  ville: string
  onSuccess?: (hostId: string, onboardingUrl: string) => void
}

export default function OnboardButton({
  email, prenom, nom, ville, onSuccess,
}: OnboardButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleOnboard = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/onboard-host', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, prenom, nom, ville }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du compte.')
        return
      }

      // Appeler le callback si fourni
      onSuccess?.(data.hostId, data.onboardingUrl)

      // Rediriger vers le formulaire Stripe Connect
      window.location.href = data.onboardingUrl

    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleOnboard}
        disabled={loading}
        className="
          bg-[#1A3A6B] text-[#F5C84A] font-medium text-sm
          px-6 py-3 rounded-xl
          hover:bg-[#0C2447] active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150
          flex items-center justify-center gap-2
        "
      >
        {loading ? (
          <>
            <span className="animate-spin text-base">⏳</span>
            Création du compte...
          </>
        ) : (
          <>
            Créer mon compte hôte →
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
