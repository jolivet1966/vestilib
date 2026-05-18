// app/api/check-capacity/route.ts
// GET /api/check-capacity?hostId=xxx&date=2026-05-15&creneau=10:00-14:00&type=consigne|moto|velo|depot
import { NextRequest, NextResponse } from 'next/server'
import { adminDb }                   from '@/lib/firebase-admin'

const ARTICLES_CONSIGNE = ['4h-casque','4h-blouson','4h-sac','8h-casque','8h-blouson','8h-sac']
const ARTICLES_DEPOT    = ['depot-24h','depot-7j']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hostId  = searchParams.get('hostId')
  const date    = searchParams.get('date')
  const creneau = searchParams.get('creneau')
  const type    = searchParams.get('type') ?? 'consigne' // consigne | moto | velo | depot

  if (!hostId || !date || !creneau) {
    return NextResponse.json({ error: 'hostId, date et creneau requis' }, { status: 400 })
  }

  try {
    // 1. Récupérer les capacités de l'hôte
    const hostDoc = await adminDb.collection('hosts').doc(hostId).get()
    if (!hostDoc.exists) {
      return NextResponse.json({ error: 'Hôte introuvable' }, { status: 404 })
    }
    const host = hostDoc.data()!

    const capaciteMax = type === 'moto'  ? (host.capaciteMaxMoto  ?? 999)
                      : type === 'velo'  ? (host.capaciteMaxVelo  ?? 999)
                      : type === 'depot' ? (host.capaciteMaxDepot ?? 999)
                      :                   (host.capaciteMax       ?? 999)

    // 2. Compter les articles déjà réservés sur ce créneau
    const snap = await adminDb
      .collection('bookings')
      .where('hostId',  '==', hostId)
      .where('date',    '==', date)
      .where('creneau', '==', creneau)
      .where('status',  'in', ['paid', 'pending'])
      .get()

    const articlesReserves = snap.docs.reduce((sum, doc) => {
      const data = doc.data()
      const ids = type === 'moto'  ? ['parking-moto']
                : type === 'velo'  ? ['parking-velo']
                : type === 'depot' ? ARTICLES_DEPOT
                :                    ARTICLES_CONSIGNE
      const nb = (data.prestations ?? [])
        .filter((p: { tarifId: string; quantite: number }) => ids.includes(p.tarifId))
        .reduce((s: number, p: { tarifId: string; quantite: number }) => s + p.quantite, 0)
      return sum + nb
    }, 0)

    const placesRestantes = Math.max(capaciteMax - articlesReserves, 0)

    return NextResponse.json({
      type,
      capaciteMax,
      articlesReserves,
      placesRestantes,
      complet: articlesReserves >= capaciteMax,
    })

  } catch (err: any) {
    console.error('[check-capacity]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}