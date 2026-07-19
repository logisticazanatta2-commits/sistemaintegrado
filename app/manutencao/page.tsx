import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import WorkOrdersManager from "./work-orders-manager";

export const dynamic = "force-dynamic";

export default async function ManutencaoPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl w-full mx-auto">
          <PageHeader
            title="Manutencao"
            description="Ordens de servico por veiculo, com oficina, custos e status."
          />
          <WorkOrdersManager canEdit={user.role === "admin"} />
        </div>
      </main>
    </AppShell>
  );
}
