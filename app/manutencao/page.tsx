import AppHeader from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import WorkOrdersManager from "./work-orders-manager";

export const dynamic = "force-dynamic";

export default async function ManutencaoPage() {
  const user = await requireUser();

  return (
    <>
      <AppHeader user={user} />
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Manutencao</h1>
        <p className="text-slate-600 mb-6 text-sm">
          Ordens de servico por veiculo, com oficina, custos e status.
        </p>
        <WorkOrdersManager canEdit={user.role === "admin"} />
      </main>
    </>
  );
}
