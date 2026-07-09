// app/api/migrate-hosts-private/route.ts
// Route a usage unique : migre les hotes existants vers la nouvelle structure
// (telephone/email deplaces vers hosts/{id}/private/contact)
// Protegee par CRON_SECRET, a supprimer une fois la migration effectuee.
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const snap = await adminDb.collection('hosts').get()

    let migrated = 0
    let skipped = 0
    const details: string[] = []

    for (const docSnap of snap.docs) {
      const data = docSnap.data()

      if (data.email === undefined && data.telephone === undefined) {
        skipped++
        continue
      }

      const email = data.email ?? null
      const telephone = data.telephone ?? null

      await adminDb.collection('hosts').doc(docSnap.id).collection('private').doc('contact').set({
        email,
        telephone,
      }, { merge: true })

      await adminDb.collection('hosts').doc(docSnap.id).update({
        email: FieldValue.delete(),
        telephone: FieldValue.delete(),
      })

      migrated++
      details.push(`${docSnap.id} (${email})`)
    }

    return NextResponse.json({ success: true, migrated, skipped, details })

  } catch (err: any) {
    console.error('[migrate-hosts-private]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}