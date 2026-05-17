// app/api/check-capacity/route.ts
// GET /api/check-capacity?hostId=xxx&date=2026-05-15&creneau=10:00–14:00
// Retourne le nombre d'articles déjà réservés sur ce créneau
// et le nombre de places restantes

import { NextRequest, NextResponse } from 'next/server'
import { adminDb }                   from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hostId  = searchParams.get('hostId')
  const date    = searchParams.get('date')
  const creneau = searchParams.get('creneau')

  if (!hostId || !date || !creneau) {
    return NextResponse.json({ error: 'hostId, date et creneau requis' }, { status: 400 })
  }

  try {
    // 1. Récupérer la capacité max de l'hôte
    const hostDoc = await adminDb.collection('hosts').doc(hostId).get()
    if (!hostDoc.exists) {
      return NextResponse.json({ error: 'Hôte introuvable' }, { status: 404 })
    }
    const host = hostDoc.data()!
    const capaciteMax: number = host.capaciteMax ?? 999

    // 2. Compter les articles déjà réservés sur ce créneau (status paid ou pending)
    const snap = await adminDb
      .collection('bookings')
      .where('hostId',  '==', hostId)
      .where('date',    '==', date)
      .where('creneau', '==', creneau)
      .where('status',  'in', ['paid', 'pending'])
      .get()

    const articlesReserves = snap.docs.reduce((sum, doc) => {
      const data = doc.data()
      // Compter uniquement les articles de consigne (pas douche/parking)
      const articlesIds = ['4h-casque','4h-blouson','4h-sac','8h-casque','8h-blouson','8h-sac','depot-24h','depot-7j']
      const nbArticles = (data.prestations ?? [])
        .filter((p: { tarifId: string; quantite: number }) => articlesIds.includes(p.tarifId))
        .reduce((s: number, p: { tarifId: string; quantite: number }) => s + p.quantite, 0)
      return sum + nbArticles
    }, 0)

    const placesRestantes = Math.max(capaciteMax - articlesReserves, 0)
    const complet = placesRestantes === 0

    return NextResponse.json({
      capaciteMax,
      articlesReserves,
      placesRestantes,
      complet,
    })

  } catch (err: any) {
    console.error('[check-capacity]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}