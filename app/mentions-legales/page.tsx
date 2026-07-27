export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#272757] px-4 pt-10 pb-6">
        <div className="max-w-lg md:max-w-2xl mx-auto">
          <p className="text-[#F5C84A] text-xs font-semibold uppercase tracking-wider mb-1">Vestilib</p>
          <h1 className="text-white text-2xl font-black">Mentions Legales</h1>
          <p className="text-white/50 text-sm mt-1">En vigueur au [DATE]</p>
        </div>
      </div>

      <div className="max-w-lg md:max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">

        <Section titre="1. Editeur du site">
          <p>Le site VESTILIB (vestilib.fr) est edite par :</p>
          <p className="mt-2">
            [NOM DE L'ENTREPRISE OU NOM/PRENOM SI AUTO-ENTREPRENEUR]<br/>
            [FORME JURIDIQUE — ex: Auto-entrepreneur, EURL, SASU...]<br/>
            Siege social : [ADRESSE COMPLETE]<br/>
            SIRET : [NUMERO SIRET]<br/>
            [Numero de TVA intracommunautaire si applicable]
          </p>
        </Section>

        <Section titre="2. Directeur de la publication">
          <p>[NOM PRENOM DU DIRIGEANT]</p>
        </Section>

        <Section titre="3. Hebergement">
          <p>Le site est heberge par :</p>
          <p className="mt-2">
            Vercel Inc.<br/>
            340 S Lemon Ave #4133<br/>
            Walnut, CA 91789, Etats-Unis<br/>
            vercel.com
          </p>
        </Section>

        <Section titre="4. Contact">
          <p>Pour toute question, vous pouvez nous contacter via la messagerie disponible sur la plateforme ou par email a l'adresse indiquee sur votre espace profil.</p>
        </Section>

        <Section titre="5. Propriete intellectuelle">
          <p>L'ensemble des contenus presents sur la plateforme VESTILIB (logo, textes, design, code) sont proteges par le droit de la propriete intellectuelle. Toute reproduction sans autorisation est interdite.</p>
        </Section>

        <Section titre="6. Assurance responsabilite civile professionnelle">
          <p>[A COMPLETER — reference de l'assurance RC Pro couvrant l'activite de mise en relation pour depot d'objets, si applicable]</p>
        </Section>

        <div className="text-center pt-4">
          <p className="text-xs text-gray-400">© 2026 VESTILIB — Tous droits reserves</p>
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