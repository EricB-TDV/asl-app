import { genererDumpSql, genererClasseurExcel } from "@/lib/backup";
import nodemailer from "nodemailer";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Sauvegarde quotidienne envoyée par email : un dump SQL complet (rechargeable
 * tel quel sur une base neuve) et un classeur Excel lisible (3 onglets : Vols,
 * Assignations, Passagers).
 *
 * Déclenchée par un service de cron externe (ex. cron-job.org) qui appelle
 * cette URL une fois par jour. Protégée par BACKUP_TOKEN.
 *
 * Usage : GET /api/backup?token=XXX
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!process.env.BACKUP_TOKEN) {
    return texte("BACKUP_TOKEN n'est pas configuré côté serveur.", 500);
  }
  if (token !== process.env.BACKUP_TOKEN) {
    return texte("Jeton invalide.", 403);
  }

  const requis = ["GMAIL_USER", "GMAIL_APP_PASSWORD", "BACKUP_EMAIL_TO"];
  const manquants = requis.filter((v) => !process.env[v]);
  if (manquants.length > 0) {
    return texte(`Variable(s) d'environnement manquante(s) : ${manquants.join(", ")}`, 500);
  }

  try {
    const [dumpSql, classeurExcel] = await Promise.all([
      genererDumpSql(),
      genererClasseurExcel(),
    ]);

    const dateJour = new Date().toISOString().slice(0, 10);

    const transporteur = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporteur.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.BACKUP_EMAIL_TO,
      subject: `Sauvegarde ASL — ${dateJour}`,
      text: "Sauvegarde quotidienne automatique de l'application ASL, en pièces jointes : un dump SQL complet (technique, à conserver précieusement) et un classeur Excel lisible (vols, assignations, passagers).",
      attachments: [
        {
          filename: `asl_dump_${dateJour}.sql`,
          content: dumpSql,
          contentType: "application/sql",
        },
        {
          filename: `asl_export_${dateJour}.xlsx`,
          content: classeurExcel,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return texte(`Sauvegarde envoyée avec succès à ${process.env.BACKUP_EMAIL_TO}.`, 200);
  } catch (err) {
    return texte(
      `Échec de l'envoi de la sauvegarde : ${err instanceof Error ? err.message : String(err)}`,
      500
    );
  }
}

function texte(contenu: string, status: number) {
  return new Response(contenu, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
