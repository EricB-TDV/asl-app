import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs et xlsx sont des bibliothèques volumineuses utilisées uniquement
  // côté serveur (routes d'export/import Excel). Les exclure du regroupement
  // webpack réduit nettement la mémoire nécessaire au build : elles sont
  // chargées directement depuis node_modules à l'exécution plutôt que
  // d'être analysées/optimisées par webpack à la compilation.
  serverExternalPackages: ["exceljs", "xlsx", "nodemailer", "postgres"],
};

export default nextConfig;
