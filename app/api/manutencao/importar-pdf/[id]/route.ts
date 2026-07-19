import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizePlate } from "@/lib/vehicles";
import type { ExtractedDocument } from "@/lib/pdf-import";

export const dynamic = "force-dynamic";

interface MaintenanceImportRow {
  id: number;
  vehicle_id: number | null;
  work_order_id: number | null;
  file_key: string;
  file_name: string;
  file_size: number;
  status: string;
  error_message: string | null;
  doc_type: string | null;
  doc_number: string | null;
  os_number: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  service_date: string | null;
  supplier_name: string | null;
  supplier_document: string | null;
  responsible_name: string | null;
  plate_raw: string | null;
  plate_normalized: string | null;
  odometer_extracted: number | null;
  observations: string | null;
  extracted_json: string;
  products_total_cents: number | null;
  services_total_cents: number | null;
  discount_cents: number | null;
  surcharge_cents: number | null;
  total_cents: number | null;
  total_calculated_cents: number | null;
  financial_status: string;
  duplicate_of_import_id: number | null;
  created_by: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

async function loadImport(env: CloudflareEnv, id: number) {
  const record = await env.DB.prepare(`SELECT * FROM maintenance_imports WHERE id = ?`)
    .bind(id)
    .first<MaintenanceImportRow>();
  if (!record) return null;

  let vehicle = null;
  if (record.vehicle_id) {
    vehicle = await env.DB.prepare(
      `SELECT id, plate, model, category, odometer, odometer_reference_date FROM vehicles WHERE id = ?`
    )
      .bind(record.vehicle_id)
      .first();
  }

  return { ...record, extracted: JSON.parse(record.extracted_json) as ExtractedDocument, vehicle };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  const { env } = getCloudflareContext();
  const id = Number((await params).id);
  const record = await loadImport(env, id);
  if (!record) {
    return NextResponse.json({ error: "Importacao nao encontrada." }, { status: 404 });
  }
  return NextResponse.json({ import: record });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }
  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const existing = await env.DB.prepare(`SELECT id, status FROM maintenance_imports WHERE id = ?`)
    .bind(id)
    .first<{ id: number; status: string }>();
  if (!existing) {
    return NextResponse.json({ error: "Importacao nao encontrada." }, { status: 404 });
  }
  if (existing.status === "confirmado") {
    return NextResponse.json({ error: "Esta importacao ja foi confirmada." }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as {
    extracted?: ExtractedDocument;
    vehicle_id?: number | null;
    financial_status?: string;
    status?: "cancelado" | "rascunho";
    duplicate_override_reason?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  if (body.status === "cancelado") {
    await env.DB.prepare(
      `UPDATE maintenance_imports SET status = 'cancelado', updated_at = datetime('now') WHERE id = ?`
    )
      .bind(id)
      .run();
    return NextResponse.json({ ok: true });
  }

  const vehicleId = body.vehicle_id;
  if (vehicleId !== undefined && vehicleId !== null) {
    const vehicle = await env.DB.prepare(`SELECT id, plate FROM vehicles WHERE id = ?`)
      .bind(vehicleId)
      .first<{ id: number; plate: string | null }>();
    if (!vehicle) {
      return NextResponse.json({ error: "Veiculo selecionado nao existe." }, { status: 400 });
    }
  }

  const sets: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  if (body.extracted) {
    const e = body.extracted;
    const itemsTotal = e.items.reduce((sum, item) => sum + item.total_cents, 0);
    const calculatedTotal = itemsTotal - (e.discount_cents ?? 0) + (e.surcharge_cents ?? 0);
    sets.push(
      "extracted_json = ?",
      "doc_type = ?",
      "doc_number = ?",
      "os_number = ?",
      "invoice_number = ?",
      "issue_date = ?",
      "service_date = ?",
      "supplier_name = ?",
      "supplier_document = ?",
      "responsible_name = ?",
      "plate_raw = ?",
      "plate_normalized = ?",
      "odometer_extracted = ?",
      "observations = ?",
      "products_total_cents = ?",
      "services_total_cents = ?",
      "discount_cents = ?",
      "surcharge_cents = ?",
      "total_cents = ?",
      "total_calculated_cents = ?"
    );
    values.push(
      JSON.stringify(e),
      e.doc_type,
      e.doc_number,
      e.os_number,
      e.invoice_number,
      e.issue_date,
      e.service_date,
      e.supplier_name,
      e.supplier_document,
      e.responsible_name,
      e.plate,
      e.plate ? normalizePlate(e.plate) : null,
      e.odometer,
      e.observations.join("\n"),
      e.products_total_cents,
      e.services_total_cents,
      e.discount_cents,
      e.surcharge_cents,
      e.total_cents,
      calculatedTotal
    );
  }

  if (vehicleId !== undefined) {
    sets.push("vehicle_id = ?");
    values.push(vehicleId);
  }
  if (body.financial_status) {
    sets.push("financial_status = ?");
    values.push(body.financial_status);
  }
  if (body.status === "rascunho") {
    sets.push("status = 'rascunho'");
  }
  if (body.duplicate_override_reason) {
    sets.push("duplicate_override_by = ?", "duplicate_override_reason = ?", "status = 'revisao_necessaria'");
    values.push(user.name, body.duplicate_override_reason);
  }

  values.push(id);
  await env.DB.prepare(`UPDATE maintenance_imports SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  const record = await loadImport(env, id);
  return NextResponse.json({ import: record });
}
