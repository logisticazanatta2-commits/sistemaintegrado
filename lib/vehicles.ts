export type VehicleCategory = "veiculo" | "equipamento" | "particular";
export type VehicleStatus =
  | "disponivel"
  | "em_uso"
  | "em_manutencao"
  | "bloqueado"
  | "inativo";

export interface Vehicle {
  id: number;
  category: VehicleCategory;
  plate: string | null;
  registered_plate: string | null;
  model: string;
  vehicle_type: string | null;
  nickname: string | null;
  responsible: string | null;
  cost_center: string | null;
  status: VehicleStatus;
  asset_code: string | null;
  renavam: string | null;
  chassis: string | null;
  manufacture_year: number | null;
  model_year: number | null;
  owner_name: string | null;
  odometer: number;
  odometer_reference_date: string | null;
  uf_base: string | null;
  fleet_class: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  "veiculo",
  "equipamento",
  "particular",
];

export const VEHICLE_STATUSES: VehicleStatus[] = [
  "disponivel",
  "em_uso",
  "em_manutencao",
  "bloqueado",
  "inativo",
];

export function normalizePlate(raw: string): string {
  return raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export interface VehicleInput {
  category: VehicleCategory;
  plate?: string | null;
  registered_plate?: string | null;
  model: string;
  vehicle_type?: string | null;
  nickname?: string | null;
  responsible?: string | null;
  cost_center?: string | null;
  status?: VehicleStatus;
  asset_code?: string | null;
  renavam?: string | null;
  chassis?: string | null;
  manufacture_year?: number | null;
  model_year?: number | null;
  owner_name?: string | null;
  odometer?: number;
  odometer_reference_date?: string | null;
  uf_base?: string | null;
  fleet_class?: string | null;
  notes?: string | null;
}

export class ValidationError extends Error {}

export function parseVehicleInput(body: unknown): VehicleInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;

  const category = b.category;
  if (typeof category !== "string" || !VEHICLE_CATEGORIES.includes(category as VehicleCategory)) {
    throw new ValidationError("Categoria invalida.");
  }

  const model = typeof b.model === "string" ? b.model.trim() : "";
  if (!model) {
    throw new ValidationError("Modelo e obrigatorio.");
  }

  let status: VehicleStatus = "disponivel";
  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !VEHICLE_STATUSES.includes(b.status as VehicleStatus)) {
      throw new ValidationError("Status invalido.");
    }
    status = b.status as VehicleStatus;
  }

  let odometer = 0;
  if (b.odometer !== undefined && b.odometer !== null && b.odometer !== "") {
    const n = Number(b.odometer);
    if (!Number.isFinite(n) || n < 0) {
      throw new ValidationError("Hodometro precisa ser um numero positivo.");
    }
    odometer = Math.round(n);
  }

  const plateRaw = typeof b.plate === "string" ? b.plate.trim() : "";
  const plate = plateRaw ? normalizePlate(plateRaw) : null;
  if (category !== "particular" && category !== "equipamento" && !plate) {
    throw new ValidationError("Placa e obrigatoria para veiculos.");
  }

  const str = (key: string): string | null => {
    const v = b[key];
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed ? trimmed : null;
  };

  const int = (key: string): number | null => {
    const v = b[key];
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  return {
    category: category as VehicleCategory,
    plate,
    registered_plate: str("registered_plate"),
    model,
    vehicle_type: str("vehicle_type"),
    nickname: str("nickname"),
    responsible: str("responsible"),
    cost_center: str("cost_center"),
    status,
    asset_code: str("asset_code"),
    renavam: str("renavam"),
    chassis: str("chassis"),
    manufacture_year: int("manufacture_year"),
    model_year: int("model_year"),
    owner_name: str("owner_name"),
    odometer,
    odometer_reference_date: str("odometer_reference_date"),
    uf_base: str("uf_base"),
    fleet_class: str("fleet_class"),
    notes: str("notes"),
  };
}
