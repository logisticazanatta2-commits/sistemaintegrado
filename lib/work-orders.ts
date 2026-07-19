export type WorkOrderStatus =
  | "solicitada"
  | "em_analise"
  | "aguardando_orcamento"
  | "aguardando_aprovacao"
  | "aprovada"
  | "em_execucao"
  | "concluida"
  | "faturada"
  | "encerrada"
  | "cancelada";

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "solicitada",
  "em_analise",
  "aguardando_orcamento",
  "aguardando_aprovacao",
  "aprovada",
  "em_execucao",
  "concluida",
  "faturada",
  "encerrada",
  "cancelada",
];

export const WORK_ORDER_STATUS_TONE: Record<WorkOrderStatus, "ok" | "info" | "warn" | "crit" | "neutral"> = {
  solicitada: "neutral",
  em_analise: "neutral",
  aguardando_orcamento: "warn",
  aguardando_aprovacao: "warn",
  aprovada: "info",
  em_execucao: "info",
  concluida: "ok",
  faturada: "ok",
  encerrada: "neutral",
  cancelada: "crit",
};

export interface WorkOrderItem {
  id: number;
  work_order_id: number;
  description: string;
  quantity: number;
  unit_cost_cents: number;
  created_at: string;
}

export type MaintenanceType =
  | "preventiva"
  | "corretiva"
  | "periodica"
  | "pneus"
  | "recall"
  | "acessorios"
  | "outro";

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  "preventiva",
  "corretiva",
  "periodica",
  "pneus",
  "recall",
  "acessorios",
  "outro",
];

export interface WorkOrder {
  id: number;
  vehicle_id: number;
  status: WorkOrderStatus;
  problem_description: string;
  workshop: string | null;
  requested_by: string | null;
  approved_by: string | null;
  payment_method: string | null;
  final_cost_cents: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  maintenance_type: MaintenanceType | null;
  os_number: string | null;
  invoice_number: string | null;
  payment_term: string | null;
  project_client: string | null;
  odometer_at_service: number | null;
  created_at: string;
  updated_at: string;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  items_total_cents?: number;
}

export class ValidationError extends Error {}

export interface WorkOrderInput {
  vehicle_id: number;
  status: WorkOrderStatus;
  problem_description: string;
  workshop: string | null;
  requested_by: string | null;
  approved_by: string | null;
  payment_method: string | null;
  final_cost_cents: number | null;
  opened_at: string | null;
  closed_at: string | null;
  notes: string | null;
  maintenance_type: MaintenanceType | null;
  os_number: string | null;
  invoice_number: string | null;
  payment_term: string | null;
  project_client: string | null;
  odometer_at_service: number | null;
}

export function parseWorkOrderInput(body: unknown): WorkOrderInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;

  const vehicleId = Number(b.vehicle_id);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    throw new ValidationError("Veiculo e obrigatorio.");
  }

  let status: WorkOrderStatus = "solicitada";
  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !WORK_ORDER_STATUSES.includes(b.status as WorkOrderStatus)) {
      throw new ValidationError("Status invalido.");
    }
    status = b.status as WorkOrderStatus;
  }

  const problemDescription = typeof b.problem_description === "string" ? b.problem_description.trim() : "";
  if (!problemDescription) {
    throw new ValidationError("Descricao do problema e obrigatoria.");
  }

  const str = (key: string): string | null => {
    const v = b[key];
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed ? trimmed : null;
  };

  let finalCostCents: number | null = null;
  if (b.final_cost_cents !== undefined && b.final_cost_cents !== null && b.final_cost_cents !== "") {
    const n = Number(b.final_cost_cents);
    if (!Number.isFinite(n) || n < 0) {
      throw new ValidationError("Custo final precisa ser um numero positivo.");
    }
    finalCostCents = Math.round(n);
  }

  let maintenanceType: MaintenanceType | null = null;
  if (b.maintenance_type !== undefined && b.maintenance_type !== null && b.maintenance_type !== "") {
    if (
      typeof b.maintenance_type !== "string" ||
      !MAINTENANCE_TYPES.includes(b.maintenance_type as MaintenanceType)
    ) {
      throw new ValidationError("Tipo de manutencao invalido.");
    }
    maintenanceType = b.maintenance_type as MaintenanceType;
  }

  let odometerAtService: number | null = null;
  if (b.odometer_at_service !== undefined && b.odometer_at_service !== null && b.odometer_at_service !== "") {
    const n = Number(b.odometer_at_service);
    if (!Number.isFinite(n) || n < 0) {
      throw new ValidationError("Hodometro no atendimento precisa ser um numero positivo.");
    }
    odometerAtService = Math.round(n);
  }

  return {
    vehicle_id: vehicleId,
    status,
    problem_description: problemDescription,
    workshop: str("workshop"),
    requested_by: str("requested_by"),
    approved_by: str("approved_by"),
    payment_method: str("payment_method"),
    final_cost_cents: finalCostCents,
    opened_at: str("opened_at"),
    closed_at: str("closed_at"),
    notes: str("notes"),
    maintenance_type: maintenanceType,
    os_number: str("os_number"),
    invoice_number: str("invoice_number"),
    payment_term: str("payment_term"),
    project_client: str("project_client"),
    odometer_at_service: odometerAtService,
  };
}

export interface WorkOrderItemInput {
  description: string;
  quantity: number;
  unit_cost_cents: number;
}

export function parseWorkOrderItemInput(body: unknown): WorkOrderItemInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;

  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (!description) {
    throw new ValidationError("Descricao do item e obrigatoria.");
  }

  const quantity = Number(b.quantity ?? 1);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ValidationError("Quantidade precisa ser maior que zero.");
  }

  const unitCostCents = Number(b.unit_cost_cents ?? 0);
  if (!Number.isFinite(unitCostCents) || unitCostCents < 0) {
    throw new ValidationError("Custo unitario precisa ser um numero positivo.");
  }

  return {
    description,
    quantity: Math.round(quantity),
    unit_cost_cents: Math.round(unitCostCents),
  };
}
