import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { FineValidationError, parseFineInput, type Fine } from "@/lib/fines";
import { normalizePlate } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const fine = await env.DB.prepare(
    `SELECT f.*, v.plate AS vehicle_plate, v.model AS vehicle_model
     FROM fines f LEFT JOIN vehicles v ON v.id = f.vehicle_id WHERE f.id = ?`
  )
    .bind(id)
    .first<Fine>();

  if (!fine) {
    return NextResponse.json({ error: "Multa nao encontrada." }, { status: 404 });
  }
  return NextResponse.json({ fine });
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
    return NextResponse.json({ error: "Sem permissao para editar multas." }, { status: 403 });
  }
  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const existing = await env.DB.prepare(`SELECT id FROM fines WHERE id = ?`).bind(id).first();
  if (!existing) {
    return NextResponse.json({ error: "Multa nao encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  let input;
  try {
    input = parseFineInput(body);
  } catch (err) {
    if (err instanceof FineValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao validar dados." }, { status: 400 });
  }

  let vehicleId = input.vehicle_id;
  let plateNormalized: string | null = null;
  if (vehicleId) {
    const vehicle = await env.DB.prepare(`SELECT id, plate FROM vehicles WHERE id = ?`)
      .bind(vehicleId)
      .first<{ id: number; plate: string | null }>();
    if (!vehicle) {
      return NextResponse.json({ error: "Veiculo selecionado nao existe." }, { status: 400 });
    }
    plateNormalized = vehicle.plate ? normalizePlate(vehicle.plate) : null;
  } else if (input.plate_raw) {
    plateNormalized = normalizePlate(input.plate_raw);
    const vehicle = await env.DB.prepare(
      `SELECT id FROM vehicles WHERE UPPER(REPLACE(REPLACE(plate, '-', ''), ' ', '')) = ?`
    )
      .bind(plateNormalized)
      .first<{ id: number }>();
    vehicleId = vehicle?.id ?? null;
  }

  const fine = await env.DB.prepare(
    `UPDATE fines SET
      vehicle_id = ?, plate_raw = ?, plate_normalized = ?, year = ?, department = ?,
      fleet_company = ?, notes = ?, fine_type = ?, parent_fine_id = ?, auto_number = ?,
      renainf_number = ?, renainf_original = ?, points = ?, infraction_date = ?,
      infraction_location = ?, infraction_code = ?, infraction_description = ?,
      issuing_body_code = ?, issuing_body = ?, driver_name = ?, indication_deadline = ?,
      form_sent_date = ?, form_received_by = ?, protocol_date = ?, identification_method = ?,
      invoice_status = ?, cigam_launch_number = ?, amount_cents = ?, discount_cents = ?,
      amount_paid_cents = ?, due_date = ?, discount_launched = ?, discount_launch_date = ?,
      discount_method = ?, discount_completed = ?, discount_completion_date = ?, status = ?,
      updated_at = datetime('now')
     WHERE id = ?
     RETURNING *`
  )
    .bind(
      vehicleId,
      input.plate_raw,
      plateNormalized,
      input.year,
      input.department,
      input.fleet_company,
      input.notes,
      input.fine_type,
      input.parent_fine_id,
      input.auto_number,
      input.renainf_number,
      input.renainf_original,
      input.points,
      input.infraction_date,
      input.infraction_location,
      input.infraction_code,
      input.infraction_description,
      input.issuing_body_code,
      input.issuing_body,
      input.driver_name,
      input.indication_deadline,
      input.form_sent_date,
      input.form_received_by,
      input.protocol_date,
      input.identification_method,
      input.invoice_status,
      input.cigam_launch_number,
      input.amount_cents,
      input.discount_cents,
      input.amount_paid_cents,
      input.due_date,
      input.discount_launched,
      input.discount_launch_date,
      input.discount_method,
      input.discount_completed,
      input.discount_completion_date,
      input.status,
      id
    )
    .first<Fine>();

  return NextResponse.json({ fine });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para excluir multas." }, { status: 403 });
  }
  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  await env.DB.prepare(`UPDATE fines SET parent_fine_id = NULL WHERE parent_fine_id = ?`).bind(id).run();
  await env.DB.prepare(`UPDATE fines SET duplicate_of_fine_id = NULL WHERE duplicate_of_fine_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM fines WHERE id = ?`).bind(id).run();

  return NextResponse.json({ ok: true });
}
