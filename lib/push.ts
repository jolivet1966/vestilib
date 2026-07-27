const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib-z8oc.vercel.app'

export async function sendPush(params: { userEmail?: string; userId?: string; title: string; body: string; url?: string }) {
  try {
    await fetch(`${APP_URL}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify(params),
    })
  } catch (err: any) {
    console.error('[push] Erreur:', err.message)
  }
}
