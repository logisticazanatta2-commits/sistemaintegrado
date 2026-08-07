import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildHistoryEntries, canCreateFine, canEditOfficialData, FineValidationError, parseFineInput, type Fine } from "@/lib/fines";
import { normalizePlate } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

const OFFICIAL_FIELDS = [
  "vehicle_id", "plate_raw", "year", "department_id", "fleet_company", "notes",
  "fine_type", "parent_fine_id", "auto_number", "renainf_number", "renainf_original",
  "points", "infraction_date", "infraction_location", "infraction_code",
  "infraction_description", "issuing_body_code", "issuing_body", "amount_cents",
  "discount_cents", "due_date", "status",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const fine = await env.DB.prepare(
    `SELECT f.*, v.plate AS vehicle_plate, v.model AS vehicle_model, d.name AS department_name
     FROM fines f
     LEFT JOIN vehicles v ON v.id = f.vehicle_id
     LEFT JOIN departments d ON d.id = f.department_id
     WHERE f.id = ?`
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
  if (!canEditOfficialData(user)) {
    return NextResponse.json({ error: "Sem permissao para editar multas." }, { status: 403 });
  }
  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const existing = await env.DB.prepare(`SELECT * FROM fines WHERE id = ?`).bind(id).first<Fine>();
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
  let departmentId = input.department_id;
  if (vehicleId) {
    const vehicle = await env.DB.prepare(`SELECT id, plate, department_id FROM vehicles WHERE id = ?`)
      .bind(vehicleId)
      .first<{ id: number; plate: string | null; department_id: number | null }>();
    if (!vehicle) {
      return NextResponse.json({ error: "Veiculo selecionado nao existe." }, { status: 400 });
    }
    plateNormalized = vehicle.plate ? normalizePlate(vehicle.plate) : null;
    if (!departmentId) departmentId = vehicle.department_id;
  } else if (input.plate_raw) {
    plateNormalized = normalizePlate(input.plate_raw);
    const vehicle = await env.DB.prepare(
      `SELECT id, department_id FROM vehicles WHERE UPPER(REPLACE(REPLACE(plate, '-', ''), ' ', '')) = ?`
    )
      .bind(plateNormalized)
      .first<{ id: number; department_id: number | null }>();
    vehicleId = vehicle?.id ?? null;
    if (!departmentId) departmentId = vehicle?.department_id ?? null;
  }
  if (!departmentId) departmentId = existing.department_id;

  const fine = await env.DB.prepare(
    `UPDATE fines SET
      vehicle_id = ?, plate_raw = ?, plate_normalized = ?, year = ?, department = ?, department_id = ?,
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
      departmentId,
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

  if (fine) {
    const entries = buildHistoryEntries(
      existing as unknown as Record<string, unknown>,
      { ...input, department_id: departmentId } as unknown as Record<string, unknown>,
      OFFICIAL_FIELDS
    );
    for (const entry of entries) {
      await env.DB.prepare(
        `INSERT INTO fine_history (fine_id, user_name, field_label, old_value, new_value) VALUES (?, ?, ?, ?, ?)`
      )
        .bind(id, user.name, entry.field_label, entry.old_value, entry.new_value)
        .run();
    }
  }

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
  if (!canCreateFine(user)) {
    return NextResponse.json({ error: "Sem permissao para excluir multas." }, { status: 403 });
  }
  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  await env.DB.prepare(`UPDATE fines SET parent_fine_id = NULL WHERE parent_fine_id = ?`).bind(id).run();
  await env.DB.prepare(`UPDATE fines SET duplicate_of_fine_id = NULL WHERE duplicate_of_fine_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM fines WHERE id = ?`).bind(id).run();

  return NextResponse.json({ ok: true });
}
