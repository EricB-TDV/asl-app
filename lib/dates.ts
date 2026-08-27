/** Convertit une date au format DD/MM/AAAA (format CSV import/export ASL) en ISO (yyyy-mm-dd). */
export function ddmmyyyyVersIso(valeur: string): string | null {
  const m = valeur.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, jj, mm, aaaa] = m;
  const jour = Number(jj);
  const mois = Number(mm);
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  return `${aaaa}-${mm}-${jj}`;
}

/** Convertit une date ISO (yyyy-mm-dd) en DD/MM/AAAA pour l'export ASL. */
export function isoVersDdmmyyyy(valeur: string): string {
  const [aaaa, mm, jj] = valeur.split("-");
  return `${jj}/${mm}/${aaaa}`;
}
