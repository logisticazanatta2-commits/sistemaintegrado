export interface ExtractedFine {
  plate: string | null;
  renavam: string | null;
  auto_number: string | null;
  renainf_number: string | null;
  infraction_date: string | null;
  infraction_time: string | null;
  infraction_location: string | null;
  infraction_code: string | null;
  infraction_description: string | null;
  issuing_body: string | null;
  points: number | null;
  amount_cents: number | null;
  due_date: string | null;
  indication_deadline: string | null;
  owner_name: string | null;
  confidence: {
    plate: "alta" | "media" | "baixa" | "nao_identificado";
    auto_number: "alta" | "media" | "baixa" | "nao_identificado";
    amount_cents: "alta" | "media" | "baixa" | "nao_identificado";
    infraction_date: "alta" | "media" | "baixa" | "nao_identificado";
  };
}

const EXTRACTION_TOOL = {
  name: "extrair_notificacao_multa",
  description: "Registra os dados estruturados extraidos de uma notificacao de multa de transito brasileira.",
  input_schema: {
    type: "object" as const,
    properties: {
      plate: { type: ["string", "null"], description: "Placa do veiculo, maiusculas, sem espacos ou hifen" },
      renavam: { type: ["string", "null"] },
      auto_number: { type: ["string", "null"], description: "Numero do auto de infracao" },
      renainf_number: { type: ["string", "null"] },
      infraction_date: { type: ["string", "null"], description: "Formato AAAA-MM-DD" },
      infraction_time: { type: ["string", "null"], description: "Formato HH:MM" },
      infraction_location: { type: ["string", "null"] },
      infraction_code: { type: ["string", "null"] },
      infraction_description: { type: ["string", "null"] },
      issuing_body: { type: ["string", "null"], description: "Orgao autuador" },
      points: { type: ["number", "null"] },
      amount_cents: { type: ["integer", "null"], description: "Valor da multa em centavos" },
      due_date: { type: ["string", "null"], description: "Formato AAAA-MM-DD" },
      indication_deadline: { type: ["string", "null"], description: "Data limite para indicacao do condutor, formato AAAA-MM-DD" },
      owner_name: { type: ["string", "null"] },
      confidence: {
        type: "object",
        properties: {
          plate: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
          auto_number: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
          amount_cents: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
          infraction_date: { type: "string", enum: ["alta", "media", "baixa", "nao_identificado"] },
        },
        required: ["plate", "auto_number", "amount_cents", "infraction_date"],
      },
    },
    required: ["confidence"],
  },
};

const SYSTEM_PROMPT = `Voce e um assistente especializado em extrair dados estruturados de notificacoes de multas de transito brasileiras (autuacao ou penalidade).

Regras obrigatorias:
- Converta valores monetarios para CENTAVOS (inteiro). Ex: "R$ 130,16" vira 13016.
- Normalize a placa: maiusculas, sem espacos, sem hifen.
- Datas no formato AAAA-MM-DD.
- Quando um campo nao for encontrado, retorne null. Nunca invente dados.
- Atribua nivel de confianca (alta/media/baixa/nao_identificado) para placa, numero do auto, valor e data da infracao.

Use a ferramenta "extrair_notificacao_multa" para registrar o resultado.`;

export class FinePdfImportError extends Error {}

export async function extractFineFromPdf(
  apiKey: string,
  pdfBase64: string,
  fileName: string
): Promise<ExtractedFine> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
            { type: "text", text: `Extraia os dados estruturados desta notificacao de multa (arquivo: ${fileName}).` },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new FinePdfImportError(
      `Falha ao processar o documento com a IA (HTTP ${response.status}). ${bodyText.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as { content: { type: string; input?: unknown }[] };
  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse || !toolUse.input) {
    throw new FinePdfImportError("A IA nao retornou dados estruturados para este documento.");
  }

  const raw = toolUse.input as Partial<ExtractedFine>;
  return {
    plate: raw.plate ?? null,
    renavam: raw.renavam ?? null,
    auto_number: raw.auto_number ?? null,
    renainf_number: raw.renainf_number ?? null,
    infraction_date: raw.infraction_date ?? null,
    infraction_time: raw.infraction_time ?? null,
    infraction_location: raw.infraction_location ?? null,
    infraction_code: raw.infraction_code ?? null,
    infraction_description: raw.infraction_description ?? null,
    issuing_body: raw.issuing_body ?? null,
    points: raw.points ?? null,
    amount_cents: raw.amount_cents ?? null,
    due_date: raw.due_date ?? null,
    indication_deadline: raw.indication_deadline ?? null,
    owner_name: raw.owner_name ?? null,
    confidence: {
      plate: raw.confidence?.plate ?? "nao_identificado",
      auto_number: raw.confidence?.auto_number ?? "nao_identificado",
      amount_cents: raw.confidence?.amount_cents ?? "nao_identificado",
      infraction_date: raw.confidence?.infraction_date ?? "nao_identificado",
    },
  };
}
