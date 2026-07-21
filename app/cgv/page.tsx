export default function CGVPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1E3A8A] px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <p className="text-[#F5C84A] text-xs font-semibold uppercase tracking-wider mb-1">Vestilib</p>
          <h1 className="text-white text-2xl font-black">Conditions Générales de Vente</h1>
          <p className="text-white/50 text-sm mt-1">En vigueur au 1er janvier 2025</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        <Section titre="1. Objet">
          <p>Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre la plateforme VESTILIB (ci-après « la Plateforme ») et toute personne physique utilisant ses services en qualité de client ou d'hôte (ci-après « l'Utilisateur »).</p>
          <p className="mt-2">VESTILIB est une plateforme de mise en relation permettant aux utilisateurs de déposer temporairement leurs affaires personnelles (bagages, vêtements, équipements) auprès de particuliers ou professionnels référencés (les « hôtes »).</p>
        </Section>

        <Section titre="2. Inscription et compte utilisateur">
          <p>L'accès aux services VESTILIB nécessite la création d'un compte. L'Utilisateur s'engage à fournir des informations exactes et à les maintenir à jour. Toute inscription est réservée aux personnes majeures (18 ans et plus).</p>
          <p className="mt-2">L'Utilisateur est seul responsable de la confidentialité de ses identifiants de connexion.</p>
        </Section>

        <Section titre="3. Description du service">
          <p>VESTILIB met en relation des clients souhaitant déposer des effets personnels avec des hôtes proposant un espace de stockage temporaire. VESTILIB agit en qualité d'intermédiaire et n'est pas partie au contrat de dépôt conclu entre le client et l'hôte.</p>
          <p className="mt-2">Les prestations disponibles (type de dépôt, durée, tarif) sont définies par chaque hôte et affichées sur leur page de profil.</p>
        </Section>

        <Section titre="4. Réservation et paiement">
          <p>La réservation est effective après confirmation du paiement en ligne via la plateforme Stripe. Le client reçoit un code de réservation unique par email dès validation du paiement.</p>
          <p className="mt-2">Les prix affichés sont en euros toutes taxes comprises (TTC). VESTILIB perçoit une commission de 30 % sur le montant total de chaque réservation.</p>
          <p className="mt-2">Le paiement est sécurisé et traité par Stripe. VESTILIB ne conserve aucune donnée bancaire.</p>
        </Section>

        <Section titre="5. Annulation">
          <p>Toute annulation doit être effectuée avant la date de la prestation. En cas d'annulation plus de 48h avant la prestation, la carte du client n'est pas débitée et l'annulation est sans frais.</p>
          <p className="mt-2">En deçà de 48h (J-48), la réservation est ferme, définitive et non remboursable. Ces règles s'appliquent aux clients et aux hôtes.</p>
        </Section>

        <Section titre="6. Responsabilités">
          <p>L'hôte s'engage à assurer la garde des effets déposés avec soin. VESTILIB ne peut être tenu responsable des pertes, vols ou dommages survenus pendant la période de dépôt.</p>
          <p className="mt-2">Le client s'engage à ne pas déposer d'objets illicites, dangereux, périssables ou de valeur exceptionnelle sans déclaration préalable.</p>
          <p className="mt-2">VESTILIB ne saurait être tenu responsable des dommages indirects résultant de l'utilisation de la plateforme.</p>
        </Section>

        <Section titre="7. Données personnelles">
          <p>Les données personnelles collectées sont traitées conformément à notre Politique de Confidentialité, accessible depuis votre espace profil. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.</p>
        </Section>

        <Section titre="8. Propriété intellectuelle">
          <p>L'ensemble des contenus présents sur la plateforme VESTILIB (logo, textes, design, code) sont protégés par le droit de la propriété intellectuelle. Toute reproduction sans autorisation est interdite.</p>
        </Section>

        <Section titre="9. Droit applicable">
          <p>Les présentes CGV sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents du ressort du siège social de VESTILIB.</p>
        </Section>

        <Section titre="10. Contact">
          <p>Pour toute question relative aux présentes CGV, vous pouvez nous contacter via la messagerie disponible sur la plateforme ou par email à l'adresse indiquée sur votre espace profil.</p>
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
      <h2 className="text-sm font-bold text-[#1E3A8A] mb-3">{titre}</h2>
      <div className="text-xs text-gray-600 leading-relaxed">{children}</div>
    </div>
  )
}