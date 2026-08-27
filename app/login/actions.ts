"use server";

import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");

  if (!email || !motDePasse) {
    return { error: "Identifiant et mot de passe requis." };
  }

  const [utilisateur] = await db
    .select()
    .from(utilisateurs)
    .where(eq(utilisateurs.email, email));

  if (!utilisateur) {
    return { error: "Identifiants incorrects." };
  }

  const motDePasseValide = await verifyPassword(motDePasse, utilisateur.motDePasseHash);
  if (!motDePasseValide) {
    return { error: "Identifiants incorrects." };
  }

  await createSession({
    userId: utilisateur.id,
    email: utilisateur.email,
    nom: utilisateur.nom,
  });

  redirect("/vols");
}
