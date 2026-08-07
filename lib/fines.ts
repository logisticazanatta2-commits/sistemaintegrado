import type { FinesRole, SessionUser } from "@/lib/auth";

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
  department_id: number | null;
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
  department_name?: string | null;
}

export class FineValidationError extends Error {}

export interface FineInput {
  vehicle_id: number | null;
  plate_raw: string | null;
  year: number | null;
  department: string | null;
  department_id: number | null;
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
    department_id: num(b, "department_id"),
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

/* ------------------------------------------------------------------ */
/* Permissao por setor dentro do modulo de multas                     */
/* ------------------------------------------------------------------ */

export const FINES_ROLE_LABEL: Record<FinesRole, string> = {
  admin_multas: "Admin de Multas",
  gestor_setor: "Gestor de Setor",
  financeiro: "Financeiro",
  rh: "RH",
};

/** Perfil efetivo dentro do modulo de multas. Sem fines_role definido,
 *  cai no comportamento antigo (role=admin -> acesso total, senao leitura). */
export function effectiveFinesRole(user: SessionUser): FinesRole | "viewer" {
  if (user.fines_role) return user.fines_role;
  return user.role === "admin" ? "admin_multas" : "viewer";
}

export function canCreateFine(user: SessionUser): boolean {
  return effectiveFinesRole(user) === "admin_multas";
}

export function canEditOfficialData(user: SessionUser): boolean {
  return effectiveFinesRole(user) === "admin_multas";
}

export function canEditSetor(user: SessionUser, fine: Pick<Fine, "department_id">): boolean {
  const role = effectiveFinesRole(user);
  if (role === "admin_multas") return true;
  if (role === "gestor_setor") {
    return fine.department_id !== null && fine.department_id === user.fines_department_id;
  }
  return false;
}

export function canEditFinanceiro(user: SessionUser): boolean {
  const role = effectiveFinesRole(user);
  return role === "admin_multas" || role === "financeiro";
}

export function canEditRh(user: SessionUser): boolean {
  const role = effectiveFinesRole(user);
  return role === "admin_multas" || role === "rh";
}

/* ------------------------------------------------------------------ */
/* Proxima acao: o que falta, quem e ate quando (fonte unica)         */
/* ------------------------------------------------------------------ */

export type Urgency = "ok" | "warn" | "crit";

export interface NextAction {
  what: string;
  ownerLabel: string;
  ownerFinesRole: FinesRole | null;
  deadline: string | null;
  urgency: Urgency;
}

function urgencyFor(deadline: string | null, todayIso: string): Urgency {
  if (!deadline) return "ok";
  if (deadline < todayIso) return "crit";
  const days = Math.round((Date.parse(deadline) - Date.parse(todayIso)) / 86400000);
  return days <= 5 ? "warn" : "ok";
}

export function computeNextAction(fine: Fine, today: Date = new Date()): NextAction {
  const todayIso = today.toISOString().slice(0, 10);
  const setorLabel = fine.department_name ?? fine.department ?? "Setor a definir";

  switch (fine.status) {
    case "pendente":
    case "condutor_pendente":
      return {
        what: "Identificar e indicar o condutor",
        ownerLabel: setorLabel,
        ownerFinesRole: "gestor_setor",
        deadline: fine.indication_deadline,
        urgency: urgencyFor(fine.indication_deadline, todayIso),
      };
    case "protocolar_recurso":
    case "recurso_em_analise":
      return {
        what: "Protocolar/acompanhar recurso",
        ownerLabel: setorLabel,
        ownerFinesRole: "gestor_setor",
        deadline: fine.indication_deadline,
        urgency: urgencyFor(fine.indication_deadline, todayIso),
      };
    case "pagto_pendente":
    case "pagto_data_vencida":
      return {
        what: "Confirmar pagamento do boleto",
        ownerLabel: "Financeiro",
        ownerFinesRole: "financeiro",
        deadline: fine.due_date,
        urgency: urgencyFor(fine.due_date, todayIso),
      };
    case "pagto_realizado":
      if (fine.discount_launched === "SIM" && fine.discount_completed !== "SIM") {
        return {
          what: "Efetivar desconto em folha",
          ownerLabel: "RH",
          ownerFinesRole: "rh",
          deadline: fine.discount_launch_date,
          urgency: "warn",
        };
      }
      return {
        what: "Revisar e concluir o processo",
        ownerLabel: "Admin de Multas",
        ownerFinesRole: null,
        deadline: null,
        urgency: "ok",
      };
    case "concluido":
      return { what: "Nenhuma — processo concluido", ownerLabel: "-", ownerFinesRole: null, deadline: null, urgency: "ok" };
    case "cancelado":
      return { what: "Nenhuma — multa cancelada", ownerLabel: "-", ownerFinesRole: null, deadline: null, urgency: "ok" };
    default:
      return { what: "-", ownerLabel: "-", ownerFinesRole: null, deadline: null, urgency: "ok" };
  }
}

/* ------------------------------------------------------------------ */
/* Entradas por etapa (Setor / Financeiro / RH) + historico/auditoria */
/* ------------------------------------------------------------------ */

export interface FineSetorInput {
  driver_name: string | null;
  identification_method: string | null;
  form_sent_date: string | null;
  form_received_by: string | null;
  protocol_date: string | null;
}

export function parseFineSetorInput(body: unknown): FineSetorInput {
  if (typeof body !== "object" || body === null) {
    throw new FineValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;
  return {
    driver_name: str(b, "driver_name"),
    identification_method: str(b, "identification_method"),
    form_sent_date: str(b, "form_sent_date"),
    form_received_by: str(b, "form_received_by"),
    protocol_date: str(b, "protocol_date"),
  };
}

export interface FineFinanceiroInput {
  invoice_status: string | null;
  amount_paid_cents: number | null;
  due_date: string | null;
  cigam_launch_number: string | null;
  flow_financial_status: FlowStageStatus;
}

export function parseFineFinanceiroInput(body: unknown): FineFinanceiroInput {
  if (typeof body !== "object" || body === null) {
    throw new FineValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;
  return {
    invoice_status: str(b, "invoice_status"),
    amount_paid_cents: centsFromReais(b, "amount_paid"),
    due_date: str(b, "due_date"),
    cigam_launch_number: str(b, "cigam_launch_number"),
    flow_financial_status: flowStatus(b, "flow_financial_status"),
  };
}

export interface FineRhInput {
  discount_launched: string | null;
  discount_launch_date: string | null;
  discount_method: string | null;
  discount_installments: number | null;
  discount_completed: string | null;
  discount_completion_date: string | null;
  flow_rh_status: FlowStageStatus;
}

export function parseFineRhInput(body: unknown): FineRhInput {
  if (typeof body !== "object" || body === null) {
    throw new FineValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;
  return {
    discount_launched: str(b, "discount_launched"),
    discount_launch_date: str(b, "discount_launch_date"),
    discount_method: str(b, "discount_method"),
    discount_installments: num(b, "discount_installments"),
    discount_completed: str(b, "discount_completed"),
    discount_completion_date: str(b, "discount_completion_date"),
    flow_rh_status: flowStatus(b, "flow_rh_status"),
  };
}

const FIELD_LABELS: Record<string, string> = {
  driver_name: "Condutor",
  identification_method: "Forma de identificacao",
  form_sent_date: "Data de envio do formulario",
  form_received_by: "Responsavel por receber formulario",
  protocol_date: "Data de protocolo",
  invoice_status: "Situacao do boleto",
  amount_paid_cents: "Valor pago",
  due_date: "Data de vencimento",
  cigam_launch_number: "Numero de lancamento no CIGAM",
  flow_financial_status: "Situacao financeira",
  discount_launched: "Valor lancado p/ desconto",
  discount_launch_date: "Data do lancamento do desconto",
  discount_method: "Forma do desconto",
  discount_installments: "Parcelas do desconto",
  discount_completed: "Desconto efetuado",
  discount_completion_date: "Data de efetivacao do desconto",
  flow_rh_status: "Situacao no RH",
  status: "Status",
  department_id: "Setor responsavel",
  department: "Setor responsavel",
  vehicle_id: "Veiculo",
  amount_cents: "Valor da multa",
  discount_cents: "Desconto",
  driver: "Condutor",
  flow_responsible_name: "Responsavel do fluxo",
  flow_responsible_email: "E-mail do responsavel",
  flow_responsible_status: "Situacao do responsavel",
  flow_department_status: "Situacao do departamento",
  notes: "Observacoes internas",
  plate_raw: "Placa",
  auto_number: "Numero do auto de infracao",
  infraction_description: "Descricao da infracao",
};

const MONEY_FIELDS = new Set(["amount_paid_cents", "amount_cents", "discount_cents"]);
const DATE_FIELDS = new Set([
  "due_date", "form_sent_date", "protocol_date", "discount_launch_date",
  "discount_completion_date", "indication_deadline", "infraction_date",
]);

function formatHistoryValue(field: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (MONEY_FIELDS.has(field)) {
    return ((Number(value) || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (DATE_FIELDS.has(field)) {
    const s = String(value);
    return s.length >= 10 ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : s;
  }
  return String(value);
}

export interface HistoryEntry {
  field_label: string;
  old_value: string | null;
  new_value: string | null;
}

/** Compara valores antes/depois campo a campo e monta as entradas de
 *  historico correspondentes (so os campos que realmente mudaram). */
export function buildHistoryEntries(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const field of fields) {
    const oldRaw = before[field] ?? null;
    const newRaw = after[field] ?? null;
    if (String(oldRaw ?? "") === String(newRaw ?? "")) continue;
    entries.push({
      field_label: FIELD_LABELS[field] ?? field,
      old_value: formatHistoryValue(field, oldRaw),
      new_value: formatHistoryValue(field, newRaw),
    });
  }
  return entries;
}
