import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { VehicleCategory, VehicleStatus } from "@/lib/vehicles";

export interface DashboardSummary {
  totalVehicles: number;
  vehiclesByCategory: Record<VehicleCategory, number>;
  vehiclesByStatus: Record<VehicleStatus, number>;
  openWorkOrders: number;
  totalWorkOrders: number;
  costThisMonthCents: number;
  costThisYearCents: number;
  avgCostCents: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { env } = getCloudflareContext();

  const [byCategory, byStatus, woAgg] = await Promise.all([
    env.DB.prepare(`SELECT category, COUNT(*) as n FROM vehicles GROUP BY category`).all<{
      category: VehicleCategory;
      n: number;
    }>(),
    env.DB.prepare(`SELECT status, COUNT(*) as n FROM vehicles WHERE category = 'veiculo' GROUP BY status`).all<{
      status: VehicleStatus;
      n: number;
    }>(),
    env.DB.prepare(
      `SELECT
         COUNT(*) as total_os,
         SUM(CASE WHEN status NOT IN ('encerrada', 'cancelada') THEN 1 ELSE 0 END) as open_os,
         SUM(CASE WHEN strftime('%Y-%m', opened_at) = strftime('%Y-%m', 'now') THEN final_cost_cents ELSE 0 END) as cost_month,
         SUM(CASE WHEN strftime('%Y', opened_at) = strftime('%Y', 'now') THEN final_cost_cents ELSE 0 END) as cost_year,
         AVG(final_cost_cents) as avg_cost
       FROM work_orders`
    ).first<{
      total_os: number;
      open_os: number | null;
      cost_month: number | null;
      cost_year: number | null;
      avg_cost: number | null;
    }>(),
  ]);

  const vehiclesByCategory = { veiculo: 0, equipamento: 0, particular: 0 } as Record<
    VehicleCategory,
    number
  >;
  for (const row of byCategory.results) {
    vehiclesByCategory[row.category as VehicleCategory] = row.n;
  }

  const vehiclesByStatus = {
    disponivel: 0,
    em_uso: 0,
    em_manutencao: 0,
    bloqueado: 0,
    inativo: 0,
  } as Record<VehicleStatus, number>;
  for (const row of byStatus.results) {
    vehiclesByStatus[row.status as VehicleStatus] = row.n;
  }

  const totalVehicles = vehiclesByCategory.veiculo;

  return {
    totalVehicles,
    vehiclesByCategory,
    vehiclesByStatus,
    openWorkOrders: woAgg?.open_os ?? 0,
    totalWorkOrders: woAgg?.total_os ?? 0,
    costThisMonthCents: woAgg?.cost_month ?? 0,
    costThisYearCents: woAgg?.cost_year ?? 0,
    avgCostCents: Math.round(woAgg?.avg_cost ?? 0),
  };
}
