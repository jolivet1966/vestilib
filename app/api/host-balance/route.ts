// app/api/host-balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const idToken = authHeader.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(idToken)

    const hostId = req.nextUrl.searchParams.get('hostId')
    if (!hostId) {
      return NextResponse.json({ error: 'hostId requis' }, { status: 400 })
    }
    if (decoded.uid !== hostId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const hostDoc = await adminDb.collection('hosts').doc(hostId).get()
    if (!hostDoc.exists) {
      return NextResponse.json({ error: 'Hote introuvable' }, { status: 404 })
    }
    const host = hostDoc.data()!
    const stripeAccountId = host.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        available: 0,
        pending: 0,
        recentPayouts: [],
      })
    }

    const { stripe } = await import('@/lib/stripe')

    const [balanceRes, payoutsRes] = await Promise.all([
      stripe.balance.retrieve({ stripeAccount: stripeAccountId }),
      stripe.payouts.list({ limit: 5 }, { stripeAccount: stripeAccountId }),
    ])

    const available = (balanceRes.available.find(b => b.currency === 'eur')?.amount ?? 0) / 100
    const pending = (balanceRes.pending.find(b => b.currency === 'eur')?.amount ?? 0) / 100

    const recentPayouts = payoutsRes.data.map(p => ({
      id: p.id,
      amount: p.amount / 100,
      arrivalDate: new Date(p.arrival_date * 1000).toLocaleDateString('fr-FR'),
      status: p.status === 'paid' ? 'paid' : 'pending',
    }))

    return NextResponse.json({ available, pending, recentPayouts })

  } catch (err: any) {
    console.error('[host-balance]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}