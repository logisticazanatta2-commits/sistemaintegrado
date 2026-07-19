import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = await getDashboardSummary();
  const firstName = user.name.split(" ")[0];

  return (
    <AppShell user={user}>
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl w-full mx-auto flex flex-col gap-8">
          <PageHeader title={`Ola, ${firstName}`} description="Resumo da frota e da manutencao." />

          <section className="flex flex-col gap-3">
            <div className="section-label">Frota</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total na frota"
                value={String(summary.totalVehicles)}
                hint={`${summary.vehiclesByCategory.equipamento} equipamentos e ${summary.vehiclesByCategory.particular} particulares fora da frota`}
              />
              <StatCard label="Disponivel" value={String(summary.vehiclesByStatus.disponivel)} tone="accent" />
              <StatCard
                label="Em manutencao"
                value={String(summary.vehiclesByStatus.em_manutencao)}
                tone={summary.vehiclesByStatus.em_manutencao > 0 ? "warn" : "ink"}
              />
              <StatCard label="Inativo" value={String(summary.vehiclesByStatus.inativo)} />
            </div>
            <Link href="/veiculos" className="btn btn-secondary self-start">
              Ver cadastro de veiculos
            </Link>
          </section>

          <section className="flex flex-col gap-3">
            <div className="section-label">Manutencao</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="OS em aberto"
                value={String(summary.openWorkOrders)}
                hint={`${summary.totalWorkOrders} OS no total`}
                tone={summary.openWorkOrders > 0 ? "warn" : "ink"}
              />
              <StatCard label="Custo este mes" value={formatCents(summary.costThisMonthCents)} />
              <StatCard label="Custo este ano" value={formatCents(summary.costThisYearCents)} />
              <StatCard label="Custo medio por OS" value={formatCents(summary.avgCostCents)} />
            </div>
            <Link href="/manutencao" className="btn btn-secondary self-start">
              Ver ordens de servico
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
