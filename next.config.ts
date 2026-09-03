import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs et nodemailer/postgres sont utilisées uniquement côté serveur.
  // Les exclure du regroupement webpack réduit nettement la mémoire
  // nécessaire au build (utile sur les instances d'hébergement à mémoire
  // limitée, ex. Clever Cloud XS/S).
  serverExternalPackages: ["exceljs", "nodemailer", "postgres"],

  // Masque la présence de Next.js (en-tête X-Powered-By).
  poweredByHeader: false,

  // En-têtes de sécurité HTTP de base, appliqués à toutes les routes.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
