// app/api/onboard-host/refresh-link/route.ts
// Génère un nouveau lien d'onboarding quand l'ancien a expiré
import { NextRequest, NextResponse } from 'next/server'
import { stripe }                    from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json()
    if (!accountId) return NextResponse.json({ error: 'accountId requis' }, { status: 400 })

    const link = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/host/onboard/refresh?accountId=${accountId}`,
      return_url:  `${process.env.NEXT_PUBLIC_APP_URL}/host/onboard/success?accountId=${accountId}`,
      type:        'account_onboarding',
    })

    return NextResponse.json({ onboardingUrl: link.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
