import { calculerVuesParEntreprise } from "@/lib/statistiques";
import VueGlobale from "./VueGlobale";
import VueEntreprise from "./VueEntreprise";
import BilanFinancier from "./BilanFinancier";
import StatistiquesTabs from "./StatistiquesTabs";

export const dynamic = "force-dynamic";

export default async function StatistiquesPage() {
  const { aller, retour } = await calculerVuesParEntreprise();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Statistiques</h1>

      <StatistiquesTabs
        vueGlobale={<VueGlobale />}
        vueEngages={<VueEntreprise aller={aller} retour={retour} mode="engages" />}
        vueReels={<VueEntreprise aller={aller} retour={retour} mode="reels" />}
        bilanFinancier={<BilanFinancier />}
      />
    </div>
  );
}
