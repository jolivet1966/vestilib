import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'VESTILIB <noreply@vestilib.fr>'
const NO_REPLY = 'no-reply@vestilib.fr' // adresse claire, non surveillée, pour dissuader la réponse directe

// ─── Confirmation utilisateur paiement immediat ───────
export async function sendConfirmationUser(params: {
  to: string; bookingCode: string; totalAmount: number
  hostNom: string; hostAdresse: string; hostVille: string
  date?: string | null; creneau?: string | null
}) {
  const dateStr = params.date
    ? new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  await resend.emails.send({
    from: FROM, to: params.to,
    subject: `Reservation confirmee — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
          <p style="color:#999;margin:0;font-size:13px;">Pose. Profite. Reviens.</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 16px;">Reservation confirmee !</h2>
          <div style="background:#272757;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
            <p style="color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Code de reservation</p>
            <p style="color:#F5C84A;font-size:28px;font-weight:700;font-family:monospace;margin:0;">${params.bookingCode}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Hote</td><td style="padding:8px 0;text-align:right;font-weight:500;">${params.hostNom}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Adresse</td><td style="padding:8px 0;text-align:right;">${params.hostAdresse}, ${params.hostVille}</td></tr>
            ${dateStr ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date</td><td style="padding:8px 0;text-align:right;">${dateStr}</td></tr>` : ''}
            ${params.creneau ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Creneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#666;font-weight:600;">Total paye</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#272757;">${params.totalAmount}EUR</td></tr>
          </table>
        </div>
        <p style="color:#666;font-size:13px;text-align:center;margin-top:16px;">Vous pouvez consulter le detail de votre reservation dans <a href="https://vestilib-z8oc.vercel.app/profil" style="color:#272757;font-weight:600;">votre profil VESTILIB</a>.</p>
        <p style="color:#999;font-size:12px;text-align:center;">Presentez ce code a l hote lors de votre arrivee.<br/>VESTILIB · Paiement securise Stripe</p>
      </div>
    `,
  })
}

// ─── Notification hote paiement immediat ──────────────
export async function sendNotificationHote(params: {
  to: string; hostPrenom: string; bookingCode: string
  totalAmount: string; hostEarns: string
  customerEmail: string | null; date?: string | null; creneau?: string | null
}) {
  const dateStr = params.date
    ? new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  await resend.emails.send({
    from: FROM, to: params.to,
    subject: `Nouvelle reservation — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
          <p style="color:#999;margin:0;font-size:13px;">Nouvelle reservation recue</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 4px;">Bonjour ${params.hostPrenom}</h2>
          <p style="color:#666;font-size:14px;margin:0 0 20px;">Vous avez recu une nouvelle reservation !</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${dateStr ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date</td><td style="padding:8px 0;text-align:right;font-weight:500;">${dateStr}</td></tr>` : ''}
            ${params.creneau ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Creneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>` : ''}
            ${params.customerEmail ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Client</td><td style="padding:8px 0;text-align:right;">${params.customerEmail}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Montant total</td><td style="padding:8px 0;text-align:right;">${params.totalAmount}EUR</td></tr>
            <tr><td style="padding:8px 0;color:#272757;font-weight:700;">Vous recevrez</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#272757;font-size:18px;">${params.hostEarns}EUR</td></tr>
          </table>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">Le virement sera effectue automatiquement le 1er du mois.<br/>VESTILIB · Stripe Connect</p>
      </div>
    `,
  })
}

// ─── Notification hote demande validation ─────────────
export async function sendNotificationHoteDemandeReservation(params: {
  to: string; hostPrenom: string; bookingCode: string; bookingId: string
  customerEmail: string; date: string; creneau: string
  totalAmount: string; description: string
}) {
  const dateStr = new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib-z8oc.vercel.app'
  await resend.emails.send({
    from: FROM, to: params.to,
    subject: `Demande de reservation — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
          <p style="color:#999;margin:0;font-size:13px;">Nouvelle demande de reservation</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 4px;">Bonjour ${params.hostPrenom}</h2>
          <p style="color:#666;font-size:14px;margin:0 0 20px;">Un client souhaite reserver votre point de depot.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Client</td><td style="padding:8px 0;text-align:right;">${params.customerEmail}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date</td><td style="padding:8px 0;text-align:right;font-weight:500;">${dateStr}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Creneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Prestations</td><td style="padding:8px 0;text-align:right;">${params.description}</td></tr>
            <tr><td style="padding:8px 0;color:#272757;font-weight:700;">Montant</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#272757;">${params.totalAmount}EUR</td></tr>
          </table>
          <div style="text-align:center;margin-top:8px;">
            <a href="${appUrl}/host/dashboard" style="color:#272757;text-decoration:none;font-weight:400;font-size:13px;">
              Voir dans le dashboard →
            </a>
          </div>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">VESTILIB · Acceptez ou refusez depuis votre dashboard</p>
      </div>
    `,
  })
}

// ─── Email acceptation reservation ────────────────────
export async function sendBookingAccepted(params: {
  to: string; bookingCode: string; hostPrenom: string; hostNom: string
  hostAdresse: string; hostVille: string; date: string; creneau: string
  totalAmount: number; paymentUrl: string
}) {
  const dateStr = new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  await resend.emails.send({
    from: FROM, to: params.to,
    subject: `Reservation acceptee — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
          <p style="color:#999;margin:0;font-size:13px;">Votre demande a ete acceptee</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 16px;">Bonne nouvelle !</h2>
          <p style="color:#666;font-size:14px;margin:0 0 20px;">${params.hostPrenom} ${params.hostNom} a accepte votre demande de reservation.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Hote</td><td style="padding:8px 0;text-align:right;font-weight:500;">${params.hostPrenom} ${params.hostNom}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Adresse</td><td style="padding:8px 0;text-align:right;">${params.hostAdresse}, ${params.hostVille}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date</td><td style="padding:8px 0;text-align:right;">${dateStr}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Creneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>
            <tr><td style="padding:8px 0;color:#272757;font-weight:700;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#272757;">${params.totalAmount}EUR</td></tr>
          </table>
          <div style="text-align:center;margin:8px 0;">
            <a href="${params.paymentUrl}" style="color:#272757;text-decoration:none;font-weight:400;font-size:14px;">
              Payer maintenant ${params.totalAmount}EUR →
            </a>
          </div>
          <p style="color:#666;font-size:13px;text-align:center;margin-top:16px;">Vous pouvez consulter le detail de votre reservation dans <a href="https://vestilib-z8oc.vercel.app/profil" style="color:#272757;font-weight:600;">votre profil VESTILIB</a>.</p>
          <p style="color:#999;font-size:11px;text-align:center;margin-top:12px;">Ce lien de paiement est valable 24h.</p>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">VESTILIB · Paiement securise Stripe</p>
      </div>
    `,
  })
}

// ─── Email refus reservation ──────────────────────────
export async function sendBookingRefused(params: {
  to: string; bookingCode: string; hostPrenom: string; hostNom: string
  date: string; creneau: string; motifRefus: string
}) {
  const dateStr = new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  await resend.emails.send({
    from: FROM, to: params.to,
    subject: `Demande non acceptee — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 16px;">Demande non acceptee</h2>
          <p style="color:#666;font-size:14px;margin:0 0 20px;">${params.hostPrenom} ${params.hostNom} n a pas pu accepter votre demande.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date demandee</td><td style="padding:8px 0;text-align:right;">${dateStr}</td></tr>
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Creneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>
            ${params.motifRefus ? `<tr><td style="padding:8px 0;color:#666;">Motif</td><td style="padding:8px 0;text-align:right;">${params.motifRefus}</td></tr>` : ''}
          </table>
          <div style="text-align:center;margin-top:8px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib-z8oc.vercel.app'}/map" style="color:#272757;text-decoration:none;font-weight:400;font-size:13px;">
              Trouver un autre hote →
            </a>
          </div>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">VESTILIB · Nous sommes desoles pour ce desagrement</p>
      </div>
    `,
  })
}

// ─── Email message utilisateur vers hote ──────────────
// ─── Email message utilisateur vers hote ──────────────
export async function sendMessageToHote(params: {
  toHote: string; hostPrenom: string; fromNom: string
  sujet: string; message: string; messageId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib-z8oc.vercel.app'
  await resend.emails.send({
    from: FROM,
    to: params.toHote,
    reply_to: NO_REPLY,
    subject: `Nouveau message — ${params.sujet}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 4px;">Bonjour ${params.hostPrenom}</h2>
          <p style="color:#666;font-size:14px;margin:0 0 20px;">Vous avez recu un nouveau message de <strong>${params.fromNom}</strong>.</p>
          <div style="background:#F5C84A20;border-left:4px solid #F5C84A;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="font-weight:600;color:#272757;margin:0 0 8px;">Sujet : ${params.sujet}</p>
            <p style="color:#333;margin:0;line-height:1.6;">${params.message}</p>
          </div>
          <div style="text-align:center;margin-top:8px;">
            <a href="${appUrl}/messages" style="display:inline-block;background:#272757;color:#F5C84A;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
              Répondre sur VESTILIB
            </a>
          </div>
          <p style="color:#999;font-size:11px;text-align:center;margin-top:16px;">⚠️ Ne répondez pas directement à cet email, votre réponse ne sera pas transmise. Utilisez le bouton ci-dessus.</p>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">VESTILIB · Messagerie securisee</p>
      </div>
    `,
  })
}

// ─── Email confirmation message envoye ────────────────
export async function sendConfirmationMessage(params: {
  to: string; nomUtilisateur: string
  hostPrenom: string; hostNom: string; sujet: string; message: string
}) {
  await resend.emails.send({
    from: FROM, to: params.to,
    subject: `Votre message a ete envoye a ${params.hostPrenom} ${params.hostNom}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 16px;">Message envoye !</h2>
          <p style="color:#666;font-size:14px;margin:0 0 16px;">Votre message a <strong>${params.hostPrenom} ${params.hostNom}</strong> a bien ete transmis.</p>
          <div style="background:#f5f5f5;border-radius:12px;padding:16px;">
            <p style="font-weight:600;color:#333;margin:0 0 8px;">Sujet : ${params.sujet}</p>
            <p style="color:#666;margin:0;line-height:1.6;">${params.message}</p>
          </div>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:16px;">VESTILIB · Messagerie</p>
      </div>
    `,
  })
}

// ─── Email réponse hote vers client ──────────────────
export async function sendReponseClient(params: {
  to: string; fromPrenom: string; sujet: string; reponse: string; hostId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib-z8oc.vercel.app'
  await resend.emails.send({
    from: FROM,
    to: params.to,
    reply_to: NO_REPLY,
    subject: `Réponse à votre message — ${params.sujet}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
          <p style="color:#999;margin:0;font-size:13px;">Messagerie sécurisée</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <p style="color:#666;font-size:14px;margin:0 0 20px;"><strong>${params.fromPrenom}</strong> a répondu à votre message.</p>
          <div style="background:#F5C84A20;border-left:4px solid #F5C84A;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="color:#333;margin:0;line-height:1.6;">${params.reponse}</p>
          </div>
          <div style="text-align:center;margin-top:8px;">
            <a href="${appUrl}/messages?hostId=${params.hostId}" style="display:inline-block;background:#272757;color:#F5C84A;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
              Répondre sur VESTILIB
            </a>
          </div>
          <p style="color:#999;font-size:11px;text-align:center;margin-top:16px;">⚠️ Ne répondez pas directement à cet email, votre réponse ne sera pas transmise. Utilisez le bouton ci-dessus.</p>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">VESTILIB · Messagerie sécurisée · Aucune coordonnée partagée</p>
      </div>
    `,
  })
}
// ─── Contact formulaire "Nous contacter" ──────────────
export async function sendContactMessage(params: {
  fromEmail: string; fromNom: string; sujet: string; message: string
}) {
  await resend.emails.send({
    from: FROM,
    to: 'contact@vestilib.fr',
    reply_to: params.fromEmail,
    subject: `[Contact] ${params.sujet}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="background:#272757;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#F5C84A;font-size:20px;margin:0;">Nouveau message via le formulaire</h1>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
            <tr><td style="padding:6px 0;color:#666;">De</td><td style="padding:6px 0;text-align:right;font-weight:600;">${params.fromNom}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;text-align:right;">${params.fromEmail}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Sujet</td><td style="padding:6px 0;text-align:right;">${params.sujet}</td></tr>
          </table>
          <div style="background:#f5f5f5;border-radius:12px;padding:16px;">
            <p style="color:#333;margin:0;line-height:1.6;white-space:pre-wrap;">${params.message}</p>
          </div>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:16px;">Repondre a cet email revient a repondre directement au client.</p>
      </div>
    `,
  })

  await resend.emails.send({
    from: FROM,
    to: params.fromEmail,
    subject: 'Nous avons bien reçu votre message',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
          <p style="color:#999;margin:0;font-size:13px;">Merci de nous avoir contactes</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 12px;">Bonjour ${params.fromNom},</h2>
          <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Votre message a bien ete transmis a notre equipe. Nous vous repondrons directement a cette adresse email dans les plus brefs delais.
          </p>
          <div style="background:#f5f5f5;border-radius:12px;padding:16px;">
            <p style="font-weight:600;color:#333;margin:0 0 8px;">Sujet : ${params.sujet}</p>
            <p style="color:#666;margin:0;line-height:1.6;white-space:pre-wrap;">${params.message}</p>
          </div>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:16px;">VESTILIB · Pose. Profite. Reviens.</p>
      </div>
    `,
  })
}

// ─── Email annulation par le client (notification hote) ─────────────
export async function sendCancellationHote(params: {
  to: string; hostPrenom: string; bookingCode: string
  date?: string | null; creneau?: string | null
}) {
  const dateStr = params.date
    ? new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  await resend.emails.send({
    from: FROM, to: params.to,
    subject: `Reservation annulee — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
          <p style="color:#999;margin:0;font-size:13px;">Annulation de reservation</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 4px;">Bonjour ${params.hostPrenom}</h2>
          <p style="color:#666;font-size:14px;margin:0 0 20px;">Un client a annule sa reservation.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Code</td><td style="padding:8px 0;text-align:right;font-weight:600;font-family:monospace;">${params.bookingCode}</td></tr>
            ${dateStr ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date</td><td style="padding:8px 0;text-align:right;">${dateStr}</td></tr>` : ''}
            ${params.creneau ? `<tr><td style="padding:8px 0;color:#666;">Creneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>` : ''}
          </table>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">VESTILIB · Aucun paiement n a ete effectue</p>
      </div>
    `,
  })
}

// ─── Email annulation par l hote (notification client) ──────────────
export async function sendCancellationClient(params: {
  to: string; bookingCode: string
  date?: string | null; creneau?: string | null
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestilib.fr'
  const dateStr = params.date
    ? new Date(params.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  await resend.emails.send({
    from: FROM, to: params.to,
    subject: `Reservation annulee — ${params.bookingCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
        <div style="border:1px solid #27275733;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#272757;font-size:18px;font-weight:500;letter-spacing:2px;margin:0 0 6px;">VESTILIB</p>
          <p style="color:#999;margin:0;font-size:13px;">Annulation de reservation</p>
        </div>
        <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#272757;font-size:18px;margin:0 0 16px;">Votre reservation a ete annulee</h2>
          <p style="color:#666;font-size:14px;margin:0 0 20px;">L hote a annule votre reservation. Aucun paiement n a ete effectue.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Code</td><td style="padding:8px 0;text-align:right;font-weight:600;font-family:monospace;">${params.bookingCode}</td></tr>
            ${dateStr ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #f0f0f0;">Date</td><td style="padding:8px 0;text-align:right;">${dateStr}</td></tr>` : ''}
            ${params.creneau ? `<tr><td style="padding:8px 0;color:#666;">Creneau</td><td style="padding:8px 0;text-align:right;">${params.creneau}</td></tr>` : ''}
          </table>
          <div style="text-align:center;margin-top:8px;">
            <a href="${appUrl}/map" style="color:#272757;text-decoration:none;font-weight:400;font-size:13px;">
              Trouver un autre hote →
            </a>
          </div>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">VESTILIB · Nous sommes desoles pour ce desagrement</p>
      </div>
    `,
  })
}