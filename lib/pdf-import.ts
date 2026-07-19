export type ImportStatus =
  | "enviado"
  | "processando"
  | "extraido"
  | "revisao_necessaria"
  | "rascunho"
  | "confirmado"
  | "erro"
  | "cancelado"
  | "duplicado";

export const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
  enviado: "Arquivo enviado",
  processando: "Em processamento",
  extraido: "Extracao concluida",
  revisao_necessaria: "Revisao necessaria",
  rascunho: "Rascunho",
  confirmado: "Importacao confirmada",
  erro: "Erro de leitura",
  cancelado: "Cancelado",
  duplicado: "Duplicado",
};

export type ItemType = "produto" | "servico";

export type ConfidenceLevel = "alta" | "media" | "baixa" | "nao_identificado";

export const ITEM_CATEGORIES = [
  "Motor",
  "Freios",
  "Suspensao",
  "Direcao",
  "Escapamento",
  "Transmissao",
  "Embreagem",
  "Sistema eletrico",
  "Arrefecimento",
  "Lubrificacao",
  "Pneus",
  "Alinhamento e balanceamento",
  "Correia dentada",
  "Troca de oleo",
  "Filtros",
  "Funilaria",
  "Pintura",
  "Mao de obra",
  "Servico terceirizado",
  "Outros",
] as const;

export const FINANCIAL_STATUSES = [
  "orcamento_recebido",
  "em_analise",
  "aprovado",
  "reprovado",
  "em_manutencao",
  "concluido",
  "pago",
  "cancelado",
] as const;
export type FinancialStatus = (typeof FINANCIAL_STATUSES)[number];

export const FINANCIAL_STATUS_LABEL: Record<FinancialStatus, string> = {
  orcamento_recebido: "Orcamento recebido",
  em_analise: "Em analise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  em_manutencao: "Em manutencao",
  concluido: "Concluido",
  pago: "Pago",
  cancelado: "Cancelado",
};

export interface ExtractedItem {
  type: ItemType;
  code: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price_cents: number;
  discount_cents: number;
  total_cents: number;
  category: string;
  confidence: ConfidenceLevel;
}

export interface ExtractedDocument {
  doc_type: "orcamento" | "ordem_servico" | "nota_fiscal" | "outro" | null;
  doc_number: string | null;
  os_number: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  service_date: string | null;
  supplier_name: string | null;
  supplier_document: string | null;
  responsible_name: string | null;
  plate: string | null;
  vehicle_model: string | null;
  odometer: number | null;
  observations: string[];
  items: ExtractedItem[];
  products_total_cents: number | null;
  services_total_cents: number | null;
  discount_cents: number | null;
  surcharge_cents: number | null;
  total_cents: number | null;
  confidence: {
    plate: ConfidenceLevel;
    odometer: ConfidenceLevel;
    os_number: ConfidenceLevel;
    issue_date: ConfidenceLevel;
    total_cents: ConfidenceLevel;
  };
}

const EXTRACTION_TOOL = {
  name: "extrair_documento_manutencao",
  description:
    "Registra os dados estruturados extraidos de um orcamento, ordem de servico ou nota de manutencao veicular.",
  input_schema: {
    type: "object" as const,
    properties: {
      doc_type: { type: ["string", "null"], enum: ["orcamento", "ordem_servico", "nota_fiscal", "outro", null] },
      doc_number: { type: ["string", "null"] },
      os_number: { type: ["string", "null"] },
      invoice_number: { type: ["string", "null"] },
      issue_date: { type: ["string", "null"], description: "Formato AAAA-MM-DD" },
      service_date: { type: ["string", "null"], description: "Formato AAAA-MM-DD" },
      supplier_name: { type: ["string", "null"] },
      supplier_document: { type: ["string", "null"], description: "CNPJ ou CPF do fornecedor/oficina" },
      responsible_name: { type: ["string", "null"] },
      plate: { type: ["string", "null"], description: "Placa do veiculo, sem espacos ou hifen" },
      vehicle_model: { type: ["string", "null"] },
      odometer: { type: ["number", "null"] },
      observations: {
        type: "array",
        items: { type: "string" },
        description: "Cada problema/observacao relatado como uma linha separada, preservando o texto original.",
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["produto", "servico"] },
            code: { type: ["string", "null"] },
            description: { type: "string" },
            quantity: { type: "number" },
            unit: { type: ["string", "null"] },
            unit_price_cents: { type: "integer" },
            discount_cents: { type: "integer" },
            total_cents: { type: "integer" },
            category: { type: "string" },
            confidence: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
          },
          required: ["type", "description", "quantity", "unit_price_cents", "total_cents", "category", "confidence"],
        },
      },
      products_total_cents: { type: ["integer", "null"] },
      services_total_cents: { type: ["integer", "null"] },
      discount_cents: { type: ["integer", "null"] },
      surcharge_cents: { type: ["integer", "null"] },
      total_cents: { type: ["integer", "null"] },
      confidence: {
        type: "object",
        properties: {
          plate: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
          odometer: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
          os_number: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
          issue_date: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
          total_cents: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
        },
        required: ["plate", "odometer", "os_number", "issue_date", "total_cents"],
      },
    },
    required: ["observations", "items", "confidence"],
  },
};

const SYSTEM_PROMPT = `Voce e um assistente especializado em extrair dados estruturados de orcamentos, ordens de servico e notas de manutencao veicular emitidos por oficinas mecanicas brasileiras.

Regras obrigatorias:
- Preserve o conteudo real do documento. Nunca resuma, abrevie ou corrija descricoes de itens.
- Todo valor monetario deve ser convertido para CENTAVOS (inteiro). Ex: "R$ 290,00" vira 29000.
- Separe corretamente PRODUTOS/PECAS (materiais fisicos) de SERVICOS/MAO DE OBRA. Nunca misture os dois na mesma lista.
- Cada item da tabela de produtos ou servicos deve virar um registro proprio, mesmo que a descricao ocupe varias linhas no PDF -- junte as linhas que pertencem ao mesmo item, mas nunca junte dois itens diferentes em um so.
- As observacoes/problemas relatados devem ser um array com uma string por problema/linha, preservando pontuacao e o texto original -- nunca junte tudo em uma frase corrida.
- A placa deve ser normalizada: maiusculas, sem espacos, sem hifen (ex: "EVX-7B51" vira "EVX7B51").
- Quando um campo nao for encontrado no documento, retorne null. Nunca invente ou estime um valor que nao esteja no documento.
- Categorize cada item usando uma destas categorias: Motor, Freios, Suspensao, Direcao, Escapamento, Transmissao, Embreagem, Sistema eletrico, Arrefecimento, Lubrificacao, Pneus, Alinhamento e balanceamento, Correia dentada, Troca de oleo, Filtros, Funilaria, Pintura, Mao de obra, Servico terceirizado, Outros.
- Atribua um nivel de confianca (alta/media/baixa/nao_identificado) para cada item e para os campos criticos (placa, hodometro, numero da OS, data de emissao, valor total), refletindo o quanto o texto do documento e claro e inequivoco.
- Datas devem ser convertidas para o formato AAAA-MM-DD.

Use a ferramenta "extrair_documento_manutencao" para registrar o resultado. Nao responda em texto livre.`;

export class PdfImportError extends Error {}

export async function extractDocumentFromPdf(
  apiKey: string,
  pdfBase64: string,
  fileName: string
): Promise<ExtractedDocument> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            {
              type: "text",
              text: `Extraia os dados estruturados deste documento de manutencao veicular (arquivo: ${fileName}).`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new PdfImportError(`Falha ao processar o documento com a IA (HTTP ${response.status}). ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    content: { type: string; input?: unknown }[];
    stop_reason?: string;
  };

  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse || !toolUse.input) {
    throw new PdfImportError("A IA nao retornou dados estruturados para este documento.");
  }

  return normalizeExtracted(toolUse.input as Partial<ExtractedDocument>);
}

function normalizeExtracted(raw: Partial<ExtractedDocument>): ExtractedDocument {
  return {
    doc_type: raw.doc_type ?? null,
    doc_number: raw.doc_number ?? null,
    os_number: raw.os_number ?? null,
    invoice_number: raw.invoice_number ?? null,
    issue_date: raw.issue_date ?? null,
    service_date: raw.service_date ?? null,
    supplier_name: raw.supplier_name ?? null,
    supplier_document: raw.supplier_document ?? null,
    responsible_name: raw.responsible_name ?? null,
    plate: raw.plate ?? null,
    vehicle_model: raw.vehicle_model ?? null,
    odometer: raw.odometer ?? null,
    observations: Array.isArray(raw.observations) ? raw.observations : [],
    items: Array.isArray(raw.items) ? raw.items : [],
    products_total_cents: raw.products_total_cents ?? null,
    services_total_cents: raw.services_total_cents ?? null,
    discount_cents: raw.discount_cents ?? null,
    surcharge_cents: raw.surcharge_cents ?? null,
    total_cents: raw.total_cents ?? null,
    confidence: {
      plate: raw.confidence?.plate ?? "nao_identificado",
      odometer: raw.confidence?.odometer ?? "nao_identificado",
      os_number: raw.confidence?.os_number ?? "nao_identificado",
      issue_date: raw.confidence?.issue_date ?? "nao_identificado",
      total_cents: raw.confidence?.total_cents ?? "nao_identificado",
    },
  };
}

export function computeCalculatedTotal(extracted: ExtractedDocument): number {
  const itemsTotal = extracted.items.reduce((sum, item) => sum + item.total_cents, 0);
  const discount = extracted.discount_cents ?? 0;
  const surcharge = extracted.surcharge_cents ?? 0;
  return itemsTotal - discount + surcharge;
}
