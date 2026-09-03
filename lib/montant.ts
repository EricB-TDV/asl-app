/** Formate un montant en euros, arrondi à l'unité (pas de décimales). */
export function formatEurArrondi(n: number | null | undefined): string {
  if (n == null) return "";
  return Math.round(n).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

/** Classe Tailwind à appliquer selon le signe d'un montant (rouge négatif, vert positif). */
export function couleurMontant(n: number | null | undefined): string {
  if (n == null || n === 0) return "";
  return n < 0 ? "text-red-600" : "text-green-600";
}
