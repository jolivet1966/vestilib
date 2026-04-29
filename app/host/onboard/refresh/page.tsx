'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

function RefreshContent() {
  const params = useSearchParams()
  const accountId = params.get('accountId')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    fetch('/api/onboard-host/refresh-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
      .then(r => r.json())
      .then(d => { setUrl(d.onboardingUrl); setLoading(false) })
      .catch(() => setLoading(false))
  }, [accountId])

  if (loading) return <div>Chargement...</div>

  return (
    <div>
      <h1>Lien expire</h1>
      {url && <a href={url}>Continuer</a>}
    </div>
  )
}

export default function OnboardRefreshPage() {
  return (
    <Suspense fallback={<div>Chargement</div>}>
      <RefreshContent />
    </Suspense>
  )
}