// lib/tarifs.ts
// Grille tarifaire VESTILIB — source de vérité unique

export interface Tarif {
  id:          string
  categorie:   string
  label:       string
  description: string
  prix:        number
  unite:       string
}

export const TARIFS_VESTILIB: Tarif[] = [
  // Durée 4h (remise automatique au 4e article — non sélectionnable)
  { id: '4h-casque',    categorie: '4 heures', label: 'Casque',  description: 'Consigne casque — 4h',   prix: 4, unite: 'article' },
  { id: '4h-blouson',   categorie: '4 heures', label: 'Blouson', description: 'Consigne blouson — 4h',  prix: 4, unite: 'article' },
  { id: '4h-sac',       categorie: '4 heures', label: 'Sac',     description: 'Consigne sac — 4h',      prix: 4, unite: 'article' },

  // Durée 8h (remise automatique au 4e article — non sélectionnable)
  { id: '8h-casque',    categorie: '8 heures', label: 'Casque',  description: 'Consigne casque — 8h',   prix: 6, unite: 'article' },
  { id: '8h-blouson',   categorie: '8 heures', label: 'Blouson', description: 'Consigne blouson — 8h',  prix: 6, unite: 'article' },
  { id: '8h-sac',       categorie: '8 heures', label: 'Sac',     description: 'Consigne sac — 8h',      prix: 6, unite: 'article' },

  // Services
  { id: 'douche',       categorie: 'Services', label: 'Douche',  description: 'Douche',                 prix: 2, unite: 'personne' },
  { id: 'parking-moto', categorie: 'Parking',  label: 'Moto',    description: 'Parking moto',           prix: 5, unite: 'vehicule' },
  { id: 'parking-velo', categorie: 'Parking',  label: 'Vélo',    description: 'Parking vélo',           prix: 4, unite: 'vehicule' },

  // Dépôt longue durée
  { id: 'depot-24h',    categorie: 'Dépôt',    label: '24h',     description: 'Dépôt 24h (max 15kg)',   prix: 10, unite: 'article' },
  { id: 'depot-7j',     categorie: 'Dépôt',    label: '7 jours', description: 'Dépôt 7 jours (max 15kg)', prix: 50, unite: 'article' },
]

// Catégories dans l'ordre
export const CATEGORIES = ['4 heures', '8 heures', 'Services', 'Parking', 'Dépôt']

// Info remise par catégorie
export const REMISE_INFO: Record<string, string> = {
  '4 heures': '🎉 Remise automatique de 4€ dès le 4e article',
  '8 heures': '🎉 Remise automatique de 6€ dès le 4e article',
}

export function getTarifsByCategorie(categorie: string): Tarif[] {
  return TARIFS_VESTILIB.filter(t => t.categorie === categorie)
}

export function getTarifById(id: string): Tarif | undefined {
  return TARIFS_VESTILIB.find(t => t.id === id)
}

// Calcul securise du montant total a partir des prestations demandees.
// Ne jamais faire confiance a un montant envoye par le client : toujours recalculer ici.
export interface PrestationDemandee {
  tarifId: string
  quantite: number
}

export function calculerTotalSecurise(prestations: PrestationDemandee[]): { total: number; hostEarns: number } {
  const quantites: Record<string, number> = {}
  for (const p of prestations) {
    if (!p.tarifId || !p.quantite || p.quantite <= 0) continue
    if (!TARIFS_VESTILIB.find(t => t.id === p.tarifId)) continue
    quantites[p.tarifId] = (quantites[p.tarifId] ?? 0) + p.quantite
  }

  const ids4h = ['4h-casque', '4h-blouson', '4h-sac']
  const ids8h = ['8h-casque', '8h-blouson', '8h-sac']

  const nb4h = ids4h.reduce((s, id) => s + (quantites[id] ?? 0), 0)
  const nb8h = ids8h.reduce((s, id) => s + (quantites[id] ?? 0), 0)

  let sum = 0
  ids4h.forEach(id => { sum += (quantites[id] ?? 0) * 4 })
  if (nb4h >= 4) sum -= Math.floor(nb4h / 4) * 4

  ids8h.forEach(id => { sum += (quantites[id] ?? 0) * 6 })
  if (nb8h >= 4) sum -= Math.floor(nb8h / 4) * 6

  ;['douche', 'parking-moto', 'parking-velo', 'depot-24h', 'depot-7j'].forEach(id => {
    const t = TARIFS_VESTILIB.find(t => t.id === id)
    if (t && (quantites[id] ?? 0) > 0) sum += t.prix * (quantites[id] ?? 0)
  })

  const total = Math.max(sum, 0)
  const hostEarns = Math.round(total * 0.7 * 100) / 100
  return { total, hostEarns }
}