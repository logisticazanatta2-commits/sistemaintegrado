import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizePlate } from "@/lib/vehicles";
import {
  PdfImportError,
  computeCalculatedTotal,
  extractDocumentFromPdf,
  type ExtractedDocument,
} from "@/lib/pdf-import";

export const dynamic = "force-dynamic";

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
    return NextResponse.json({ error: "Sem permissao para importar documentos." }, { status: 403 });
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
  const hash = await sha256Hex(buffer);
  const fileKey = `manutencao-importacoes/${crypto.randomUUID()}.pdf`;

  const duplicate = await env.DB.prepare(
    `SELECT id, file_name, status, created_at FROM maintenance_imports
     WHERE file_hash = ? AND status NOT IN ('cancelado', 'erro') ORDER BY created_at DESC LIMIT 1`
  )
    .bind(hash)
    .first<{ id: number; file_name: string; status: string; created_at: string }>();

  await env.BUCKET.put(fileKey, buffer, { httpMetadata: { contentType: "application/pdf" } });

  const insertResult = await env.DB.prepare(
    `INSERT INTO maintenance_imports (file_key, file_name, file_size, file_hash, status, created_by, duplicate_of_import_id)
     VALUES (?, ?, ?, ?, 'processando', ?, ?)
     RETURNING id`
  )
    .bind(fileKey, file.name, file.size, hash, user.name, duplicate?.id ?? null)
    .first<{ id: number }>();

  const importId = insertResult!.id;

  let extracted: ExtractedDocument;
  try {
    const base64 = arrayBufferToBase64(buffer);
    extracted = await extractDocumentFromPdf(env.ANTHROPIC_API_KEY, base64, file.name);
  } catch (err) {
    const message = err instanceof PdfImportError ? err.message : "Erro inesperado ao processar o documento.";
    await env.DB.prepare(
      `UPDATE maintenance_imports SET status = 'erro', error_message = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(message, importId)
      .run();
    return NextResponse.json({ error: message, import_id: importId }, { status: 502 });
  }

  const plateNormalized = extracted.plate ? normalizePlate(extracted.plate) : null;
  let vehicle = null as { id: number; plate: string | null; model: string; odometer: number; category: string } | null;
  if (plateNormalized) {
    vehicle = await env.DB.prepare(
      `SELECT id, plate, model, odometer, category FROM vehicles WHERE UPPER(REPLACE(REPLACE(plate, '-', ''), ' ', '')) = ?`
    )
      .bind(plateNormalized)
      .first();
  }

  const calculatedTotal = computeCalculatedTotal(extracted);
  const status = duplicate ? "duplicado" : "revisao_necessaria";

  await env.DB.prepare(
    `UPDATE maintenance_imports SET
      vehicle_id = ?, status = ?, doc_type = ?, doc_number = ?, os_number = ?, invoice_number = ?,
      issue_date = ?, service_date = ?, supplier_name = ?, supplier_document = ?, responsible_name = ?,
      plate_raw = ?, plate_normalized = ?, odometer_extracted = ?, observations = ?, extracted_json = ?,
      products_total_cents = ?, services_total_cents = ?, discount_cents = ?, surcharge_cents = ?,
      total_cents = ?, total_calculated_cents = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      vehicle?.id ?? null,
      status,
      extracted.doc_type,
      extracted.doc_number,
      extracted.os_number,
      extracted.invoice_number,
      extracted.issue_date,
      extracted.service_date,
      extracted.supplier_name,
      extracted.supplier_document,
      extracted.responsible_name,
      extracted.plate,
      plateNormalized,
      extracted.odometer,
      extracted.observations.join("\n"),
      JSON.stringify(extracted),
      extracted.products_total_cents,
      extracted.services_total_cents,
      extracted.discount_cents,
      extracted.surcharge_cents,
      extracted.total_cents,
      calculatedTotal,
      importId
    )
    .run();

  return NextResponse.json({ import_id: importId, duplicate_of: duplicate ?? null });
}
