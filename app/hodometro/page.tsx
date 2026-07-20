import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireUserOrPublic } from "@/lib/auth";
import OdometerManager from "./odometer-manager";

export const dynamic = "force-dynamic";

export default async function HodometroPage() {
  const user = await requireUserOrPublic();

  return (
    <AppShell user={user}>
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl w-full mx-auto">
          <PageHeader
            title="Hodometro Mensal"
            description="Fonte oficial de quilometragem da frota, com historico mensal por veiculo."
          />
          <OdometerManager canEdit={user.role === "admin"} />
        </div>
      </main>
    </AppShell>
  );
}
