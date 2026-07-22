export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#272757] px-4 pt-10 pb-6">
        <div className="max-w-lg md:max-w-2xl mx-auto">
          <p className="text-[#F5C84A] text-xs font-semibold uppercase tracking-wider mb-1">Vestilib</p>
          <h1 className="text-white text-2xl font-black">Politique de Confidentialité</h1>
          <p className="text-white/50 text-sm mt-1">En vigueur au 1er janvier 2025</p>
        </div>
      </div>

      <div className="max-w-lg md:max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">

        <Section titre="1. Responsable du traitement">
          <p>VESTILIB est responsable du traitement de vos données personnelles collectées via la plateforme accessible à l'adresse vestilib-z8oc.vercel.app.</p>
        </Section>

        <Section titre="2. Données collectées">
          <p>Dans le cadre de l'utilisation de nos services, nous collectons les données suivantes :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Nom, prénom, adresse email, numéro de téléphone</li>
            <li>Données de connexion (adresse IP, navigateur, horodatage)</li>
            <li>Données de réservation (dates, créneaux, montants)</li>
            <li>Pour les hôtes : adresse postale, RIB via Stripe Connect, pièce d'identité</li>
          </ul>
        </Section>

        <Section titre="3. Finalités du traitement">
          <p>Vos données sont utilisées pour :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Créer et gérer votre compte utilisateur</li>
            <li>Traiter vos réservations et paiements</li>
            <li>Vous envoyer des confirmations et notifications par email</li>
            <li>Assurer la mise en relation client / hôte</li>
            <li>Améliorer nos services et assurer la sécurité de la plateforme</li>
          </ul>
        </Section>

        <Section titre="4. Base légale">
          <p>Le traitement de vos données repose sur :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>L'exécution du contrat de service (réservation, paiement)</li>
            <li>Votre consentement (communications optionnelles)</li>
            <li>Le respect de nos obligations légales</li>
          </ul>
        </Section>

        <Section titre="5. Destinataires des données">
          <p>Vos données peuvent être transmises aux sous-traitants suivants dans le cadre de la fourniture du service :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>Stripe</strong> — traitement des paiements (États-Unis, Privacy Shield)</li>
            <li><strong>Firebase / Google</strong> — hébergement des données (UE)</li>
            <li><strong>Resend</strong> — envoi des emails transactionnels</li>
            <li><strong>Vercel</strong> — hébergement de la plateforme</li>
          </ul>
          <p className="mt-2">Vos données ne sont jamais vendues à des tiers.</p>
        </Section>

        <Section titre="6. Durée de conservation">
          <p>Vos données sont conservées pendant toute la durée de votre compte actif, puis supprimées dans un délai de 3 ans après la dernière activité, sauf obligation légale contraire (données comptables : 10 ans).</p>
          <p className="mt-2">En cas de suppression de votre compte, vos données personnelles sont effacées immédiatement, à l'exception des données nécessaires au respect de nos obligations légales.</p>
        </Section>

        <Section titre="7. Vos droits">
          <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (« droit à l'oubli »)</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition au traitement</li>
          </ul>
          <p className="mt-2">Pour exercer ces droits, rendez-vous dans votre espace profil ou contactez-nous via la messagerie de la plateforme.</p>
          <p className="mt-2">Vous avez également le droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>
        </Section>

        <Section titre="8. Cookies">
          <p>VESTILIB utilise des cookies techniques strictement nécessaires au fonctionnement de la plateforme (authentification, session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>
        </Section>

        <Section titre="9. Sécurité">
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou divulgation. Les communications entre votre navigateur et nos serveurs sont chiffrées via HTTPS.</p>
        </Section>

        <Section titre="10. Modifications">
          <p>Nous nous réservons le droit de modifier la présente politique à tout moment. Toute modification substantielle vous sera notifiée par email ou via la plateforme.</p>
        </Section>

        <div className="text-center pt-4">
          <p className="text-xs text-gray-400">© 2025 VESTILIB — Tous droits réservés</p>
        </div>
      </div>
    </div>
  )
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h2 className="text-sm font-bold text-[#272757] mb-3">{titre}</h2>
      <div className="text-xs text-gray-600 leading-relaxed">{children}</div>
    </div>
  )
}