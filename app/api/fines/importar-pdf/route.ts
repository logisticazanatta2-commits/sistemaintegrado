import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizePlate } from "@/lib/vehicles";
import { FinePdfImportError, extractFineFromPdf } from "@/lib/fine-pdf-import";

export const dynamic = "force-dynamic";

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
  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "A chave de IA (ANTHROPIC_API_KEY) ainda nao foi configurada neste ambiente." },
      { status: 503 }
    );
  }

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

  let extracted;
  try {
    const base64 = arrayBufferToBase64(buffer);
    extracted = await extractFineFromPdf(env.ANTHROPIC_API_KEY, base64, file.name);
  } catch (err) {
    const message = err instanceof FinePdfImportError ? err.message : "Erro inesperado ao processar o documento.";
    return NextResponse.json({ error: message }, { status: 502 });
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
    vehicle,
    file_key: fileKey,
    file_name: file.name,
  });
}
