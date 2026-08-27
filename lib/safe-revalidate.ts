import { revalidatePath as nextRevalidatePath } from "next/cache";

/**
 * `revalidatePath` exige le contexte d'une requête Next.js en cours. Appelé
 * depuis un script autonome (scripts/*.ts) ou un contexte hors requête, il
 * lève une exception. On l'ignore silencieusement dans ce cas : il ne s'agit
 * que d'une invalidation de cache, sans impact sur la donnée elle-même.
 */
export function safeRevalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // no-op hors contexte requête (scripts, tests)
  }
}
