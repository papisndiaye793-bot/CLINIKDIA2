// ─── Calcul de paie — Sénégal ────────────────────────────────────────────────
// Bulletin de salaire selon les principales règles sénégalaises. Les cotisations
// (IPRES, CSS, IPM, et toute cotisation personnalisée) sont une liste éditable :
// on peut en ajouter, en supprimer, ou les activer/désactiver. S'y ajoutent
// l'impôt sur le revenu (IR/IRPP, barème progressif + réduction pour charges)
// et la TRIMF.
//
// ⚠️ Taux et plafonds éditables (onglet « Taux & barèmes »), à valider selon la
// réglementation en vigueur.

export const PLAFOND_MAX = 1_000_000_000_000; // sentinel "illimité" (JSON-safe)

export interface Cotisation {
  id: string;
  nom: string;
  sal: number; // taux salarial (décimal, ex. 0.056)
  pat: number; // taux patronal (décimal)
  plafond: number; // base plafonnée (PLAFOND_MAX = sans plafond)
  cadreOnly?: boolean; // ne s'applique qu'aux cadres
  actif: boolean; // activée / désactivée
}

export interface PaieBareme {
  cotisations: Cotisation[];
  irActif: boolean;
  irTranches: { jusqua: number; taux: number }[];
  trimfActif: boolean;
  trimf: { jusqua: number; montant: number }[];
}

export const DEFAULT_BAREME: PaieBareme = {
  cotisations: [
    { id: 'ipres_rg', nom: 'IPRES — Régime général', sal: 0.056, pat: 0.084, plafond: 432_000, actif: true },
    { id: 'ipres_rcc', nom: 'IPRES — Régime cadre', sal: 0.024, pat: 0.036, plafond: 1_296_000, cadreOnly: true, actif: true },
    { id: 'ipm', nom: 'IPM (maladie)', sal: 0.03, pat: 0.03, plafond: 250_000, actif: true },
    { id: 'css_pf', nom: 'CSS — Prestations familiales', sal: 0, pat: 0.07, plafond: 63_000, actif: true },
    { id: 'css_at', nom: 'CSS — Accident du travail', sal: 0, pat: 0.01, plafond: 63_000, actif: true },
  ],
  irActif: true,
  irTranches: [
    { jusqua: 630_000, taux: 0 },
    { jusqua: 1_500_000, taux: 0.2 },
    { jusqua: 4_000_000, taux: 0.3 },
    { jusqua: 8_000_000, taux: 0.35 },
    { jusqua: 13_500_000, taux: 0.37 },
    { jusqua: PLAFOND_MAX, taux: 0.4 },
  ],
  trimfActif: true,
  trimf: [
    { jusqua: 600_000, montant: 900 },
    { jusqua: 1_000_000, montant: 3_600 },
    { jusqua: 2_000_000, montant: 4_800 },
    { jusqua: 7_000_000, montant: 12_000 },
    { jusqua: 12_000_000, montant: 18_000 },
    { jusqua: PLAFOND_MAX, montant: 36_000 },
  ],
};

// Réduction d'impôt pour charges de famille (par nombre de parts) — annuel
const IR_REDUCTION: Record<string, { taux: number; min: number; max: number }> = {
  '1': { taux: 0, min: 0, max: 0 },
  '1.5': { taux: 0.1, min: 100_000, max: 300_000 },
  '2': { taux: 0.15, min: 200_000, max: 650_000 },
  '2.5': { taux: 0.2, min: 300_000, max: 1_100_000 },
  '3': { taux: 0.25, min: 400_000, max: 1_650_000 },
  '3.5': { taux: 0.3, min: 500_000, max: 2_030_000 },
  '4': { taux: 0.35, min: 600_000, max: 2_490_000 },
  '4.5': { taux: 0.4, min: 700_000, max: 2_755_000 },
  '5': { taux: 0.45, min: 800_000, max: 3_180_000 },
};

function trimfAnnuel(brutAnnuel: number, table: PaieBareme['trimf']): number {
  for (const tr of table) if (brutAnnuel < tr.jusqua) return tr.montant;
  return table[table.length - 1]?.montant ?? 0;
}

function irBrutAnnuel(netImposableAnnuel: number, tranches: PaieBareme['irTranches']): number {
  let reste = Math.max(0, netImposableAnnuel);
  let impot = 0;
  let bas = 0;
  for (const tr of tranches) {
    if (reste <= 0) break;
    const part = Math.min(reste, tr.jusqua - bas);
    impot += part * tr.taux;
    reste -= part;
    bas = tr.jusqua;
  }
  return impot;
}

export interface PaieParams {
  salaireBase: number;
  primes?: number;
  cadre?: boolean;
  parts?: number;
}

export interface PaieLigne {
  id: string;
  nom: string;
  base: number;
  sal: number;
  pat: number;
  montantSal: number;
  montantPat: number;
}

export interface PaieResult {
  brut: number;
  lignes: PaieLigne[];
  cotisationsSalariales: number;
  netImposable: number;
  ir: number;
  trimf: number;
  totalRetenues: number;
  netAPayer: number;
  chargesPatronales: number;
  coutTotalEmployeur: number;
}

const r = (n: number) => Math.round(n);

export function computePaie(
  { salaireBase, primes = 0, cadre = false, parts = 1 }: PaieParams,
  bareme: PaieBareme = DEFAULT_BAREME,
): PaieResult {
  const brut = salaireBase + primes;

  const lignes: PaieLigne[] = (bareme.cotisations ?? [])
    .filter((c) => c.actif && !(c.cadreOnly && !cadre))
    .map((c) => {
      const base = Math.min(brut, c.plafond || PLAFOND_MAX);
      return {
        id: c.id,
        nom: c.nom,
        base,
        sal: c.sal,
        pat: c.pat,
        montantSal: r(base * c.sal),
        montantPat: r(base * c.pat),
      };
    });

  const cotisationsSalariales = lignes.reduce((a, l) => a + l.montantSal, 0);
  const chargesPatronales = lignes.reduce((a, l) => a + l.montantPat, 0);

  const netImposable = brut - cotisationsSalariales;

  let ir = 0;
  if (bareme.irActif !== false) {
    const droitAnnuel = irBrutAnnuel(netImposable * 12, bareme.irTranches);
    const red = IR_REDUCTION[String(parts)] ?? IR_REDUCTION['1'];
    const reductionAnnuelle = red.taux > 0 ? Math.min(Math.max(droitAnnuel * red.taux, red.min || 0), red.max || PLAFOND_MAX) : 0;
    ir = r(Math.max(0, droitAnnuel - reductionAnnuelle) / 12);
  }
  const trimf = bareme.trimfActif !== false ? r(trimfAnnuel(brut * 12, bareme.trimf) / 12) : 0;

  const totalRetenues = cotisationsSalariales + ir + trimf;
  const netAPayer = brut - totalRetenues;
  const coutTotalEmployeur = brut + chargesPatronales;

  return { brut, lignes, cotisationsSalariales, netImposable, ir, trimf, totalRetenues, netAPayer, chargesPatronales, coutTotalEmployeur };
}

/** Un cadre = néphrologue ou administrateur (régime complémentaire cadre). */
export function estCadre(role: string): boolean {
  return role === 'nephrologue' || role === 'admin';
}
