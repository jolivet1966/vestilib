'use client'
// app/host/onboard/success/page.tsx
// Page de retour après onboarding Stripe Connect
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function OnboardSuccessPage() {
  const params    = useSearchParams()
  const accountId = params.get('accountId')

  useEffect(() => {
    // Notifier le backend que l'hôte a terminé le formulaire
    // (le webhook account.updated fera la mise à jour réelle)
    if (accountId) {
      fetch('/api/onboard-host/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ accountId }),
      }).catch(() => {})
    }
  }, [accountId])

  return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-[#F5C84A] rounded-full flex items-center justify-center text-4xl mb-6">✓</div>
      <h1 className="text-2xl font-semibold text-[#F5C84A] mb-2">Compte hôte activé !</h1>
      <p className="text-sm text-white/70 mb-3 leading-relaxed max-w-xs">
        Votre compte Stripe Connect est configuré. Vous allez apparaître sur la carte VESTILIB dès validation.
      </p>

      <div className="bg-white/10 rounded-2xl p-4 w-full max-w-xs mb-8 text-left">
        <p className="text-[10px] text-white/50 uppercase tracking-wider mb-3">Prochaines étapes</p>
        {[
          'Stripe valide vos informations (24–48h)',
          'Votre profil devient visible sur la carte',
          'Vous recevez les virements le 1er du mois',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-white/10 last:border-none">
            <span className="w-5 h-5 rounded-full bg-[#F5C84A] text-[#1A3A6B] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-xs text-white/80 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>

      <Link href="/" className="bg-[#F5C84A] text-[#1A3A6B] rounded-full px-8 py-3 text-sm font-medium">
        Retour à l'accueil
      </Link>
    </div>
  )
}
