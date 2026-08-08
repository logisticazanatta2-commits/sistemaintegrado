import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizePlate } from "@/lib/vehicles";
import { FinePdfImportError, extractFineFromPdf, type ExtractedFine } from "@/lib/fine-pdf-import";
import { extractPdfText, parseNotificacaoAutuacao } from "@/lib/fine-pdf-rules";

export const dynamic = "force-dynamic";

const EMPTY_EXTRACTED: ExtractedFine = {
  plate: null,
  renavam: null,
  auto_number: null,
  renainf_number: null,
  renainf_original: null,
  issuing_body_code: null,
  infraction_date: null,
  infraction_time: null,
  infraction_location: null,
  infraction_code: null,
  infraction_description: null,
  issuing_body: null,
  points: null,
  amount_cents: null,
  due_date: null,
  indication_deadline: null,
  owner_name: null,
  confidence: {
    plate: "nao_identificado",
    auto_number: "nao_identificado",
    amount_cents: "nao_identificado",
    infraction_date: "nao_identificado",
  },
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para importar notificacoes." }, { status: 403 });
  }

  const { env } = getCloudflareContext();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Somente arquivos PDF sao aceitos por enquanto." }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo maior que 20MB." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const fileKey = `multas-notificacoes/${crypto.randomUUID()}.pdf`;

  // 1) Leitor por regras (gratuito): cobre a "Notificacao de Autuacao" do
  //    SENATRAN/RENAINF, mesmo layout independente do orgao autuador.
  let extracted: ExtractedFine | null = null;
  let extractionMethod: "regras" | "ia" | "manual" = "manual";
  try {
    const text = await extractPdfText(buffer);
    extracted = parseNotificacaoAutuacao(text);
    if (extracted) extractionMethod = "regras";
  } catch {
    extracted = null;
  }

  // 2) IA (paga, opcional): so tenta se o leitor por regras nao reconheceu o
  //    documento e a chave estiver configurada. Falha da IA nao derruba a
  //    requisicao - cai para preenchimento manual com o arquivo ja anexado.
  if (!extracted && env.ANTHROPIC_API_KEY) {
    try {
      const base64 = arrayBufferToBase64(buffer);
      extracted = await extractFineFromPdf(env.ANTHROPIC_API_KEY, base64, file.name);
      extractionMethod = "ia";
    } catch (err) {
      const message = err instanceof FinePdfImportError ? err.message : "Erro inesperado ao processar o documento com IA.";
      console.error("Falha na extracao por IA, seguindo para preenchimento manual:", message);
    }
  }

  if (!extracted) {
    extracted = EMPTY_EXTRACTED;
  }

  await env.BUCKET.put(fileKey, buffer, { httpMetadata: { contentType: "application/pdf" } });

  let vehicle = null as { id: number; plate: string | null; model: string } | null;
  const plateNormalized = extracted.plate ? normalizePlate(extracted.plate) : null;
  if (plateNormalized) {
    vehicle = await env.DB.prepare(
      `SELECT id, plate, model FROM vehicles WHERE UPPER(REPLACE(REPLACE(plate, '-', ''), ' ', '')) = ?`
    )
      .bind(plateNormalized)
      .first();
  }

  return NextResponse.json({
    extracted,
    extraction_method: extractionMethod,
    vehicle,
    file_key: fileKey,
    file_name: file.name,
  });
}
