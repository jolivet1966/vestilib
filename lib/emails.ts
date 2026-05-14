// lib/emails.ts
// Envoi d'emails via Resend
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'VESTILIB <noreply@vestilib.fr>'

// ─── Email confirmation utilisateur ───────────────────
export async function sendConfirmationUser(params: {
  to:          string
  bookingCode: string
  totalAmount: number
  hostNom:     string
  hostAdresse: string
  hostVille:   string
  date?:       string | null
  creneau?:    string | null
}) {
  const dateStr = params.date
    ? new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  await resend.emails.send({
    from:    FROM,
    to:      params.to,
    subject: `✅ Réservation confirmée — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="background:#1A3A6B;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#F5C84A;font-size:24px;margin:0 0 8px;">VESTILIB</h1>
          <p style="color:rgba(255,255,255,0.7);margin:0;font-size:14px;">Pose. Profite. Reviens.</p>
        </div>

        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#1A3A6B;font-size:18px;margin:0 0 16px;">Réservation confirmée !</h2>

          <div style="background:#1A3A6B;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
            <p style="color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Code de réservation</p>
            <p style="color:#F5C84A;font-size:28px;font-weight:700;font-family:monospace;margin:0;">${params.bookingCode}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Hôte</td><td style="padding:8px 0;text-align:right;font-weight:500;">${params.hostNom}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Adresse</td><td style="padding:8px 0;text-align:right;">${params.hostAdresse}, ${params.hostVille}</td></tr>
            ${dateStr ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date</td><td style="padding:8px 0;text-align:right;">${dateStr}</td></tr>` : ''}
            ${params.creneau ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Créneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#666;font-weight:600;">Total payé</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#1A3A6B;">${params.totalAmount}€</td></tr>
          </table>
        </div>

        <p style="color:#999;font-size:12px;text-align:center;">Présentez ce code à l'hôte lors de votre arrivée.<br/>VESTILIB · Paiement sécurisé Stripe</p>
      </div>
    `,
  })
}

// ─── Email notification hôte ───────────────────────────
export async function sendNotificationHote(params: {
  to:            string
  hostPrenom:    string
  bookingCode:   string
  totalAmount:   string
  hostEarns:     string
  customerEmail: string | null
  date?:         string | null
  creneau?:      string | null
}) {
  const dateStr = params.date
    ? new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  await resend.emails.send({
    from:    FROM,
    to:      params.to,
    subject: `🔔 Nouvelle réservation — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="background:#1A3A6B;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#F5C84A;font-size:24px;margin:0 0 8px;">VESTILIB</h1>
          <p style="color:rgba(255,255,255,0.7);margin:0;font-size:14px;">Nouvelle réservation reçue</p>
        </div>

        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#1A3A6B;font-size:18px;margin:0 0 4px;">Bonjour ${params.hostPrenom} 👋</h2>
          <p style="color:#666;font-size:14px;margin:0 0 20px;">Vous avez reçu une nouvelle réservation !</p>

          <div style="background:#F5C84A20;border:1px solid #F5C84A;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="color:#1A3A6B;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Code réservation</p>
            <p style="color:#1A3A6B;font-size:22px;font-weight:700;font-family:monospace;margin:0;">${params.bookingCode}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${dateStr ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date</td><td style="padding:8px 0;text-align:right;font-weight:500;">${dateStr}</td></tr>` : ''}
            ${params.creneau ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Créneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>` : ''}
            ${params.customerEmail ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Client</td><td style="padding:8px 0;text-align:right;">${params.customerEmail}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Montant total</td><td style="padding:8px 0;text-align:right;">${params.totalAmount}€</td></tr>
            <tr><td style="padding:8px 0;color:#1A3A6B;font-weight:700;">Vous recevrez</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#1A3A6B;font-size:18px;">${params.hostEarns}€</td></tr>
          </table>
        </div>

        <p style="color:#999;font-size:12px;text-align:center;">Le virement sera effectué automatiquement le 1er du mois.<br/>VESTILIB · Stripe Connect</p>
      </div>
    `,
  })
}