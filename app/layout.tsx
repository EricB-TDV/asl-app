import type { Metadata } from "next";
import "./globals.css";
import { getSession, destroySession } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Gestion des vols ASL",
  description: "Terres d'Aventure — Gestion des vols ASL Paris-Atar",
};

const NAV_ITEMS = [
  { href: "/vols", label: "Vols" },
  { href: "/entreprises", label: "Entreprises" },
  { href: "/stocks", label: "Stocks" },
  { href: "/passagers", label: "Passagers" },
  { href: "/export", label: "Listes ASL" },
  { href: "/statistiques", label: "Statistiques" },
];

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900">
        {session && (
          <header className="bg-slate-800 text-white">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
              <nav className="flex gap-6 text-sm font-medium">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} className="hover:text-slate-200">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <form action={logoutAction} className="flex items-center gap-3">
                <span className="text-xs text-slate-300">{session.nom}</span>
                <button type="submit" className="text-xs bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-600">
                  Se déconnecter
                </button>
              </form>
            </div>
          </header>
        )}
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
