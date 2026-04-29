'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SuccessContent() {
  const params = useSearchParams()
  return (
    <div>
      <h1>Paiement confirme</h1>
      <a href="/">Retour</a>
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<div>Chargement</div>}>
      <SuccessContent />
    </Suspense>
  )
}