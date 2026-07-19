export type OdometerSource =
  | "manual"
  | "importacao"
  | "abastecimento"
  | "entrada_saida"
  | "manutencao"
  | "correcao"
  | "link_externo";

export const ODOMETER_SOURCES: OdometerSource[] = [
  "manual",
  "importacao",
  "abastecimento",
  "entrada_saida",
  "manutencao",
  "correcao",
  "link_externo",
];

export const ODOMETER_SOURCE_LABEL: Record<OdometerSource, string> = {
  manual: "Atualizacao manual",
  importacao: "Importacao de planilha",
  abastecimento: "Registro de abastecimento",
  entrada_saida: "Registro de entrada ou saida",
  manutencao: "Manutencao",
  correcao: "Correcao administrativa",
  link_externo: "Link externo",
};

export type OdometerReadingStatus = "valido" | "invalidado";

export interface OdometerReading {
  id: number;
  vehicle_id: number;
  odometer: number;
  previous_odometer: number | null;
  delta_km: number | null;
  reading_date: string;
  reference_month: string;
  source: OdometerSource;
  recorded_by: string | null;
  notes: string | null;
  status: OdometerReadingStatus;
  override: number;
  created_at: string;
}

export type OdometerFreshness = "atualizado" | "atencao" | "desatualizado" | "sem_registro";

export const ODOMETER_FRESHNESS_LABEL: Record<OdometerFreshness, string> = {
  atualizado: "Atualizado",
  atencao: "Atencao",
  desatualizado: "Desatualizado",
  sem_registro: "Sem registro",
};

export const ODOMETER_FRESHNESS_TONE: Record<
  OdometerFreshness,
  "ok" | "warn" | "crit" | "neutral"
> = {
  atualizado: "ok",
  atencao: "warn",
  desatualizado: "crit",
  sem_registro: "neutral",
};

export const ODOMETER_ATENCAO_DAYS = 30;
export const ODOMETER_DESATUALIZADO_DAYS = 45;

export function computeFreshness(daysSinceUpdate: number | null): OdometerFreshness {
  if (daysSinceUpdate === null) return "sem_registro";
  if (daysSinceUpdate <= ODOMETER_ATENCAO_DAYS) return "atualizado";
  if (daysSinceUpdate <= ODOMETER_DESATUALIZADO_DAYS) return "atencao";
  return "desatualizado";
}

export function referenceMonth(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export class OdometerValidationError extends Error {}

export interface OdometerReadingInput {
  vehicle_id: number;
  odometer: number;
  reading_date: string;
  source: OdometerSource;
  notes: string | null;
  override: boolean;
}

export function parseOdometerReadingInput(body: unknown): OdometerReadingInput {
  if (typeof body !== "object" || body === null) {
    throw new OdometerValidationError("Corpo da requisicao invalido.");
  }
  const b = body as Record<string, unknown>;

  const vehicleId = Number(b.vehicle_id);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    throw new OdometerValidationError("Veiculo invalido.");
  }

  if (b.odometer === undefined || b.odometer === null || b.odometer === "") {
    throw new OdometerValidationError("Informe o hodometro.");
  }
  const odometer = Number(b.odometer);
  if (!Number.isFinite(odometer) || Number.isNaN(odometer)) {
    throw new OdometerValidationError("Hodometro invalido.");
  }
  if (odometer < 0) {
    throw new OdometerValidationError("O hodometro nao pode ser negativo.");
  }
  if (odometer === 0) {
    throw new OdometerValidationError("O hodometro nao pode ser zero.");
  }

  const readingDate = typeof b.reading_date === "string" ? b.reading_date.trim() : "";
  if (!readingDate || !/^\d{4}-\d{2}-\d{2}$/.test(readingDate)) {
    throw new OdometerValidationError("Informe uma data de referencia valida (AAAA-MM-DD).");
  }
  const today = new Date().toISOString().slice(0, 10);
  if (readingDate > today) {
    throw new OdometerValidationError("A data do hodometro nao pode ser no futuro.");
  }

  const source = typeof b.source === "string" ? b.source : "manual";
  if (!ODOMETER_SOURCES.includes(source as OdometerSource)) {
    throw new OdometerValidationError("Origem da atualizacao invalida.");
  }

  const notes = typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null;
  const override = b.override === true;

  return {
    vehicle_id: vehicleId,
    odometer: Math.round(odometer),
    reading_date: readingDate,
    source: source as OdometerSource,
    notes,
    override,
  };
}
