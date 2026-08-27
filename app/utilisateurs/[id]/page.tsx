import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ModifierUtilisateurForm from "./ModifierUtilisateurForm";

export const dynamic = "force-dynamic";

export default async function ModifierUtilisateurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [utilisateur] = await db
    .select()
    .from(utilisateurs)
    .where(eq(utilisateurs.id, Number(id)));

  if (!utilisateur) notFound();

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Modifier le compte</h1>
      <ModifierUtilisateurForm
        id={utilisateur.id}
        nomInitial={utilisateur.nom}
        emailInitial={utilisateur.email}
      />
    </div>
  );
}
