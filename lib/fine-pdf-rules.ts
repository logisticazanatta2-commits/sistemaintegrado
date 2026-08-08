import { getDocumentProxy, extractText } from "unpdf";
import type { ExtractedFine } from "./fine-pdf-import";
import { normalizePlate } from "./vehicles";

/**
 * Leitor por regras da "NOTIFICACAO DE AUTUACAO" emitida pelo SENATRAN/RENAINF.
 * Esse layout e o mesmo (rotulos fixos, gerados por sistema) independente do
 * orgao autuador (DER, DETRAN, PRF, CET...), entao um unico leitor cobre a
 * maior parte das multas recebidas, sem custo de IA.
 *
 * Estrategia: os rotulos aparecem sempre na mesma ordem relativa no texto
 * extraido do PDF, cada um seguido pela sua unica linha de valor (exceto a
 * descricao da infracao, que pode quebrar em mais de uma linha). Percorremos
 * o texto com um cursor que so avanca, entao rotulos repetidos (ex: "NOME",
 * "CPF/CNPJ" que aparecem para condutor/proprietario/embarcador) sao
 * capturados na ordem certa mesmo sem estarem unicos no documento.
 */

const DOCUMENT_ANCHOR = "NOTIFICAÇÃO DE AUTUAÇÃO";

type FieldKey =
  | "issuing_body_code"
  | "issuing_body"
  | "auto_number"
  | "indication_deadline"
  | "plate"
  | "infraction_location"
  | "infraction_date"
  | "infraction_time"
  | "infraction_code"
  | "desdobramento"
  | "amount"
  | "infraction_description"
  | "renainf_number"
  | "renainf_original"
  | "owner_name";

interface FieldSpec {
  label: string;
  key: FieldKey | null; // null = rotulo so serve de delimitador, valor descartado
  multiline?: boolean;
}

// Ordem exata observada no texto gerado pelo SENATRAN (validada com documento real).
const FIELDS: FieldSpec[] = [
  { label: "CÓDIGO DO ÓRGÃO AUTUADOR", key: "issuing_body_code" },
  { label: "ÓRGÃO AUTUADOR", key: "issuing_body" },
  { label: "CÓDIGO DO ÓRGÃO COMPETENTE", key: null },
  { label: "ÓRGÃO COMPETENTE", key: null },
  { label: "IDENTIFICAÇÃO DO AUTO DE INFRAÇÃO", key: "auto_number" },
  { label: "DATA DA NOTIFICAÇÃO DA AUTUAÇÃO", key: null },
  { label: "DATA LIMITE PARA INTERPOSIÇÃO DE DEFESA PRÉVIA", key: null },
  { label: "DATA LIMITE PARA IDENTIFICAÇÃO DO CONDUTOR INFRATOR", key: "indication_deadline" },
  { label: "PLACA", key: "plate" },
  { label: "ESPÉCIE", key: null },
  { label: "PAÍS", key: null },
  { label: "MARCA/MODELO/VERSÃO", key: null },
  { label: "NOME", key: null }, // condutor - nao preenchemos automaticamente (indicacao e etapa formal)
  { label: "CNH", key: null },
  { label: "DOC", key: null },
  { label: "UF/PAÍS", key: null },
  { label: "LOCAL DA INFRAÇÃO", key: "infraction_location" },
  { label: "DATA", key: "infraction_date" },
  { label: "HORA", key: "infraction_time" },
  { label: "CÓDIGO DO MUNICÍPIO", key: null },
  { label: "NOME DO MUNICÍPIO", key: null },
  { label: "UF", key: null },
  { label: "CÓDIGO DA INFRAÇÃO", key: "infraction_code" },
  { label: "DESDOBRAMENTO", key: "desdobramento" },
  { label: "VALOR DA MULTA", key: "amount" },
  { label: "DESCRIÇÃO DA INFRAÇÃO", key: "infraction_description", multiline: true },
  { label: "NÚMERO RENAINF", key: "renainf_number" },
  { label: "NÚMERO RENAINF MULTA ORIGINAL", key: "renainf_original" },
  { label: "NOME DO PROPRIETÁRIO", key: "owner_name" },
];

const MULTILINE_STOPWORDS = ["MEDIÇÃO REALIZADA", "NÚMERO RENAINF", "VALOR CONSIDERADO"];
const BLANK_VALUES = new Set(["não disponível", "nao disponivel", "não se aplica", "nao se aplica", "-"]);

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || BLANK_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function toIsoDate(value: string | null | undefined): string | null {
  const v = clean(value);
  if (!v) return null;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toAmountCents(value: string | null | undefined): number | null {
  const v = clean(value);
  if (!v) return null;
  const digits = v.replace(/[^\d,]/g, "").replace(",", ".");
  const n = Number(digits);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

/**
 * Tenta extrair os dados usando o leitor por regras. Retorna null quando o
 * documento nao parece ser esse layout, ou quando nao consegue achar nenhum
 * dado minimamente util (placa/numero do auto) - nesses casos o chamador
 * deve cair para a IA (se configurada) ou para preenchimento manual.
 */
export function parseNotificacaoAutuacao(rawText: string): ExtractedFine | null {
  const anchorIndex = rawText.indexOf(DOCUMENT_ANCHOR);
  if (anchorIndex === -1) return null;

  const lines = rawText
    .slice(anchorIndex + DOCUMENT_ANCHOR.length)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const values: Partial<Record<FieldKey, string | null>> = {};
  let cursor = 0;

  for (const field of FIELDS) {
    let labelIndex = -1;
    for (let i = cursor; i < lines.length; i++) {
      if (lines[i].startsWith(field.label)) {
        labelIndex = i;
        break;
      }
    }
    if (labelIndex === -1) continue; // campo opcional ausente, segue tentando os proximos

    if (field.multiline) {
      const parts: string[] = [];
      let i = labelIndex + 1;
      while (i < lines.length && parts.length < 4 && !MULTILINE_STOPWORDS.some((s) => lines[i].startsWith(s))) {
        parts.push(lines[i]);
        i++;
      }
      if (field.key) values[field.key] = parts.join(" ");
      cursor = i;
    } else {
      const value = lines[labelIndex + 1] ?? null;
      if (field.key) values[field.key] = value;
      cursor = labelIndex + 2;
    }
  }

  const plate = clean(values.plate) ? normalizePlate(clean(values.plate) as string) : null;
  const autoNumber = clean(values.auto_number);

  if (!plate && !autoNumber) return null; // nao reconheceu dados suficientes

  const codigo = clean(values.infraction_code);
  const desdobramento = clean(values.desdobramento);
  const infractionCode = codigo ? (desdobramento ? `${codigo}-${desdobramento}` : codigo) : null;

  const infractionDate = toIsoDate(values.infraction_date);
  const amountCents = toAmountCents(values.amount);

  return {
    plate,
    renavam: null,
    auto_number: autoNumber,
    renainf_number: clean(values.renainf_number),
    renainf_original: clean(values.renainf_original),
    issuing_body_code: clean(values.issuing_body_code),
    infraction_date: infractionDate,
    infraction_time: clean(values.infraction_time),
    infraction_location: clean(values.infraction_location),
    infraction_code: infractionCode,
    infraction_description: clean(values.infraction_description ?? null),
    issuing_body: clean(values.issuing_body),
    points: null,
    amount_cents: amountCents,
    due_date: null, // nao consta na notificacao de autuacao, so na de penalidade
    indication_deadline: toIsoDate(values.indication_deadline),
    owner_name: clean(values.owner_name),
    confidence: {
      plate: plate ? "alta" : "nao_identificado",
      auto_number: autoNumber ? "alta" : "nao_identificado",
      amount_cents: amountCents !== null ? "alta" : "nao_identificado",
      infraction_date: infractionDate ? "alta" : "nao_identificado",
    },
  };
}
