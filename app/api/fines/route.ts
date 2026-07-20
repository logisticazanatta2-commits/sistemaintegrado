import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { FineValidationError, parseFineInput, type Fine } from "@/lib/fines";
import { normalizePlate } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

// Leitura publica (tela de consulta sem login); escrita continua exigindo admin abaixo.
export async function GET() {
  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(
    `SELECT f.*, v.plate AS vehicle_plate, v.model AS vehicle_model
     FROM fines f
     LEFT JOIN vehicles v ON v.id = f.vehicle_id
     ORDER BY f.infraction_date DESC, f.id DESC
     LIMIT 2000`
  ).all<Fine>();

  return NextResponse.json({ fines: result.results });
}

async function findDuplicate(
  env: CloudflareEnv,
  input: ReturnType<typeof parseFineInput>,
  plateNormalized: string | null
) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (input.auto_number) {
    conditions.push("auto_number = ?");
    params.push(input.auto_number);
  }
  if (input.renainf_number) {
    conditions.push("renainf_number = ?");
    params.push(input.renainf_number);
  }
  if (plateNormalized && input.infraction_date && input.amount_cents !== null) {
    conditions.push("(plate_normalized = ? AND infraction_date = ? AND amount_cents = ?)");
    params.push(plateNormalized, input.infraction_date, input.amount_cents);
  }

  if (conditions.length === 0) return null;

  return env.DB.prepare(
    `SELECT id, auto_number, renainf_number, plate_normalized, infraction_date, amount_cents, status
     FROM fines WHERE ${conditions.join(" OR ")} LIMIT 1`
  )
    .bind(...params)
    .first();
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para cadastrar multas." }, { status: 403 });
  }

  const { env } = getCloudflareContext();

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

  const confirmDuplicate = (body as Record<string, unknown>).confirm_duplicate === true;
  if (!confirmDuplicate) {
    const duplicate = await findDuplicate(env, input, plateNormalized);
    if (duplicate) {
      return NextResponse.json(
        { error: "Possivel multa duplicada encontrada.", duplicate },
        { status: 409 }
      );
    }
  }

  const fileKey = typeof (body as Record<string, unknown>).file_key === "string"
    ? ((body as Record<string, unknown>).file_key as string)
    : null;
  const fileName = typeof (body as Record<string, unknown>).file_name === "string"
    ? ((body as Record<string, unknown>).file_name as string)
    : null;
  const source = fileKey ? "importacao_pdf" : "manual";

  const fine = await env.DB.prepare(
    `INSERT INTO fines (
      vehicle_id, plate_raw, plate_normalized, year, department, fleet_company, notes,
      fine_type, parent_fine_id, auto_number, renainf_number, renainf_original, points,
      infraction_date, infraction_location, infraction_code, infraction_description,
      issuing_body_code, issuing_body, driver_name, indication_deadline, form_sent_date,
      form_received_by, protocol_date, identification_method, invoice_status,
      cigam_launch_number, amount_cents, discount_cents, amount_paid_cents, due_date,
      discount_launched, discount_launch_date, discount_method, discount_completed,
      discount_completion_date, status, created_by, file_key, file_name, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      user.name,
      fileKey,
      fileName,
      source
    )
    .first<Fine>();

  return NextResponse.json({ fine }, { status: 201 });
}
