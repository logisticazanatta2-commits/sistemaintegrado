import AppHeader from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import VehiclesManager from "./vehicles-manager";

export const dynamic = "force-dynamic";

export default async function VeiculosPage() {
  const user = await requireUser();

  return (
    <>
      <AppHeader user={user} />
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto" style={{ background: "var(--paper)" }}>
        <PageHeader
          title="Cadastro de Veiculos"
          description="Veiculos, equipamentos e particulares vinculados a frota."
        />
        <VehiclesManager canEdit={user.role === "admin"} />
      </main>
    </>
  );
}
