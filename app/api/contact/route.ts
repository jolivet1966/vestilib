import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { fromEmail, fromNom, sujet, message } = await req.json()

    if (!fromEmail || !fromNom || !sujet || !message) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regexEmail.test(fromEmail)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    const { sendContactMessage } = await import('@/lib/emails')
    await sendContactMessage({ fromEmail, fromNom, sujet, message })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[contact]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}