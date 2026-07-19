export type FineStatus =
  | "pendente"
  | "condutor_pendente"
  | "protocolar_recurso"
  | "recurso_em_analise"
  | "pagto_pendente"
  | "pagto_data_vencida"
  | "pagto_realizado"
  | "concluido"
  | "cancelado";

export const FINE_STATUSES: FineStatus[] = [
  "pendente",
  "condutor_pendente",
  "protocolar_recurso",
  "recurso_em_analise",
  "pagto_pendente",
  "pagto_data_vencida",
  "pagto_realizado",
  "concluido",
  "cancelado",
];

export const FINE_STATUS_LABEL: Record<FineStatus, string> = {
  pendente: "Pendente",
  condutor_pendente: "Condutor pendente",
  protocolar_recurso: "Protocolar recurso",
  recurso_em_analise: "Recurso em analise",
  pagto_pendente: "Pagto. pendente",
  pagto_data_vencida: "Pagto. data vencida",
  pagto_realizado: "Pagto. realizado",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

export const FINE_STATUS_TONE: Record<FineStatus, "ok" | "warn" | "crit" | "neutral" | "info"> = {
  pendente: "neutral",
  condutor_pendente: "warn",
  protocolar_recurso: "warn",
  recurso_em_analise: "info",
  pagto_pendente: "warn",
  pagto_data_vencida: "crit",
  pagto_realizado: "ok",
  concluido: "ok",
  cancelado: "neutral",
};

export type FineType = "primeira" | "segunda";

export type FlowStageStatus = "nao_iniciado" | "aguardando_responsavel" | "em_andamento" | "concluido";

export const FLOW_STAGE_STATUSES: FlowStageStatus[] = [
  "nao_iniciado",
  "aguardando_responsavel",
  "em_andamento",
  "concluido",
];

export const FLOW_STAGE_STATUS_LABEL: Record<FlowStageStatus, string> = {
  nao_iniciado: "Nao iniciado",
  aguardando_responsavel: "Aguardando responsavel",
  em_andamento: "Em andamento",
  concluido: "Concluido",
};

export const FLOW_STAGE_STATUS_TONE: Record<FlowStageStatus, "ok" | "warn" | "neutral"> = {
  nao_iniciado: "neutral",
  aguardando_responsavel: "warn",
  em_andamento: "warn",
  concluido: "ok",
};

export const DEPARTMENTS = [
  "Administrativo",
  "Comercial",
  "Eletrica",
  "Fabrica",
  "Logistica",
  "Montagem",
  "Obras",
  "Diretoria",
  "Recursos Humanos",
  "Terceiros",
  "Locadora",
  "Outros",
] as const;

export const FLEET_COMPANIES = [
  "Zanatta (SP)",
  "Zanatta (RS)",
  "Van der Hoeven",
  "Localiza / Rent a Car",
  "Outro",
] as const;

export interface Fine {
  id: number;
  vehicle_id: number | null;
  plate_raw: string | null;
  plate_normalized: string | null;
  year: number | null;
  registered_at: string;
  registered_by: string | null;
  department: string | null;
  fleet_company: string | null;
  notes: string | null;
  fine_type: FineType;
  parent_fine_id: number | null;
  duplicate_of_fine_id: number | null;
  auto_number: string | null;
  renainf_number: string | null;
  renainf_original: string | null;
  points: number | null;
  infraction_date: string | null;
  infraction_location: string | null;
  infraction_code: string | null;
  infraction_description: string | null;
  issuing_body_code: string | null;
  issuing_body: string | null;
  driver_name: string | null;
  indication_deadline: string | null;
  form_sent_date: string | null;
  form_received_by: string | null;
  protocol_date: string | null;
  identification_method: string | null;
  invoice_status: string | null;
  cigam_launch_number: string | null;
  amount_cents: number | null;
  discount_cents: number | null;
  amount_paid_cents: number | null;
  due_date: string | null;
  discount_launched: string | null;
  discount_launch_date: string | null;
  discount_method: string | null;
  discount_completed: string | null;
  discount_completion_date: string | null;
  discount_installments: number | null;
  flow_responsible_name: string | null;
  flow_responsible_email: string | null;
  flow_responsible_status: FlowStageStatus;
  flow_department_status: FlowStageStatus;
  flow_rh_status: FlowStageStatus;
  flow_financial_status: FlowStageStatus;
  status: FineStatus;
  file_key: string | null;
  file_name: string | null;
  source: "manual" | "importacao_pdf" | "importacao_planilha";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
}

export class FineValidationError extends Error {}

export interface FineInput {
  vehicle_id: number | null;
  plate_raw: string | null;
  year: number | null;
  department: string | null;
  fleet_company: string | null;
  notes: string | null;
  fine_type: FineType;
  parent_fine_id: number | null;
  auto_number: string | null;
  renainf_number: string | null;
  renainf_original: string | null;
  points: number | null;
  infraction_date: string | null;
  infraction_location: string | null;
  infraction_code: string | null;
  infraction_description: string | null;
  issuing_body_code: string | null;
  issuing_body: string | null;
  driver_name: string | null;
  indication_deadline: string | null;
  form_sent_date: string | null;
  form_received_by: string | null;
  protocol_date: string | null;
  identification_method: string | null;
  invoice_status: string | null;
  cigam_launch_number: string | null;
  amount_cents: number | null;
  discount_cents: number | null;
  amount_paid_cents: number | null;
  due_date: string | null;
  discount_launched: string | null;
  discount_launch_date: string | null;
  discount_method: string | null;
  discount_completed: string | null;
  discount_completion_date: string | null;
  status: FineStatus;
}

function str(b: Record<string, unknown>, key: string): string | null {
  const v = b[key];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

function num(b: Record<string, unknown>, key: string): number | null {
  const v = b[key];
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function centsFromReais(b: Record<string, unknown>, key: string): number | null {
  const v = b[key];
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function parseFineInput(body: unknown): FineInput {
  if (typeof body !== "object" || body === null) {
    throw new FineValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;

  const status = typeof b.status === "string" ? b.status : "pendente";
  if (!FINE_STATUSES.includes(status as FineStatus)) {
    throw new FineValidationError("Status invalido.");
  }

  const fineType = b.fine_type === "segunda" ? "segunda" : "primeira";

  const vehicleId = num(b, "vehicle_id");
  const plateRaw = str(b, "plate_raw");
  if (!vehicleId && !plateRaw) {
    throw new FineValidationError("Informe a placa ou selecione um veiculo.");
  }

  return {
    vehicle_id: vehicleId,
    plate_raw: plateRaw,
    year: num(b, "year"),
    department: str(b, "department"),
    fleet_company: str(b, "fleet_company"),
    notes: str(b, "notes"),
    fine_type: fineType,
    parent_fine_id: num(b, "parent_fine_id"),
    auto_number: str(b, "auto_number"),
    renainf_number: str(b, "renainf_number"),
    renainf_original: str(b, "renainf_original"),
    points: num(b, "points"),
    infraction_date: str(b, "infraction_date"),
    infraction_location: str(b, "infraction_location"),
    infraction_code: str(b, "infraction_code"),
    infraction_description: str(b, "infraction_description"),
    issuing_body_code: str(b, "issuing_body_code"),
    issuing_body: str(b, "issuing_body"),
    driver_name: str(b, "driver_name"),
    indication_deadline: str(b, "indication_deadline"),
    form_sent_date: str(b, "form_sent_date"),
    form_received_by: str(b, "form_received_by"),
    protocol_date: str(b, "protocol_date"),
    identification_method: str(b, "identification_method"),
    invoice_status: str(b, "invoice_status"),
    cigam_launch_number: str(b, "cigam_launch_number"),
    amount_cents: centsFromReais(b, "amount"),
    discount_cents: centsFromReais(b, "discount"),
    amount_paid_cents: centsFromReais(b, "amount_paid"),
    due_date: str(b, "due_date"),
    discount_launched: str(b, "discount_launched"),
    discount_launch_date: str(b, "discount_launch_date"),
    discount_method: str(b, "discount_method"),
    discount_completed: str(b, "discount_completed"),
    discount_completion_date: str(b, "discount_completion_date"),
    status: status as FineStatus,
  };
}

export interface FineFlowInput {
  department: string | null;
  flow_responsible_name: string | null;
  flow_responsible_email: string | null;
  flow_responsible_status: FlowStageStatus;
  flow_department_status: FlowStageStatus;
  flow_rh_status: FlowStageStatus;
  discount_method: string | null;
  discount_installments: number | null;
  discount_completion_date: string | null;
  flow_financial_status: FlowStageStatus;
  cigam_launch_number: string | null;
  notes: string | null;
}

function flowStatus(b: Record<string, unknown>, key: string): FlowStageStatus {
  const v = b[key];
  if (typeof v === "string" && FLOW_STAGE_STATUSES.includes(v as FlowStageStatus)) {
    return v as FlowStageStatus;
  }
  return "nao_iniciado";
}

export function parseFineFlowInput(body: unknown): FineFlowInput {
  if (typeof body !== "object" || body === null) {
    throw new FineValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;

  return {
    department: str(b, "department"),
    flow_responsible_name: str(b, "flow_responsible_name"),
    flow_responsible_email: str(b, "flow_responsible_email"),
    flow_responsible_status: flowStatus(b, "flow_responsible_status"),
    flow_department_status: flowStatus(b, "flow_department_status"),
    flow_rh_status: flowStatus(b, "flow_rh_status"),
    discount_method: str(b, "discount_method"),
    discount_installments: num(b, "discount_installments"),
    discount_completion_date: str(b, "discount_completion_date"),
    flow_financial_status: flowStatus(b, "flow_financial_status"),
    cigam_launch_number: str(b, "cigam_launch_number"),
    notes: str(b, "notes"),
  };
}
