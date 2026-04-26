'use client'
// app/host/onboard/refresh/page.tsx
// Stripe redirige ici si le lien d'onboarding a expiré
import { useEffect, useState } from 'react'
import { useSearchParams }     from 'next/navigation'

export default function OnboardRefreshPage() {
  const params    = useSearchParams()
  const accountId = params.get('accountId')
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    // Générer un nouveau lien d'onboarding
    fetch('/api/onboard-host/refresh-link', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ accountId }),
    })
      .then(r => r.json())
      .then(d => { setUrl(d.onboardingUrl); setLoading(false) })
      .catch(() => setLoading(false))
  }, [accountId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Génération d'un nouveau lien...</p>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-gray-800 mb-2">Lien expiré</h1>
      <p className="text-sm text-gray-400 mb-6">Votre lien d'onboarding a expiré. Cliquez ci-dessous pour continuer.</p>
      {url && (
        <a href={url} className="bg-[#1A3A6B] text-[#F5C84A] rounded-full px-8 py-3 text-sm font-medium">
          Continuer l'onboarding →
        </a>
      )}
    </div>
  )
}
