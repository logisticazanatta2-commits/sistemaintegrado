import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import VehiclesManager from "./vehicles-manager";

export const dynamic = "force-dynamic";

export default async function VeiculosPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl w-full mx-auto">
          <PageHeader
            title="Cadastro de Veiculos"
            description="Veiculos, equipamentos e particulares vinculados a frota."
          />
          <VehiclesManager canEdit={user.role === "admin"} />
        </div>
      </main>
    </AppShell>
  );
}
