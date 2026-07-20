import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  OdometerValidationError,
  parseOdometerReadingInput,
  referenceMonth,
  type OdometerReading,
} from "@/lib/odometer";
import type { Vehicle } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

interface VehicleWithReadings extends Vehicle {
  last_odometer: number | null;
  last_reading_date: string | null;
  last_source: string | null;
  prev_odometer: number | null;
  prev_reading_date: string | null;
}

export async function GET() {
  const { env } = getCloudflareContext();

  const result = await env.DB.prepare(
    `WITH ranked AS (
       SELECT *, ROW_NUMBER() OVER (PARTITION BY vehicle_id ORDER BY reading_date DESC, id DESC) AS rn
       FROM odometer_readings
       WHERE status = 'valido'
     )
     SELECT v.*,
       r1.odometer AS last_odometer, r1.reading_date AS last_reading_date, r1.source AS last_source,
       r2.odometer AS prev_odometer, r2.reading_date AS prev_reading_date
     FROM vehicles v
     LEFT JOIN ranked r1 ON r1.vehicle_id = v.id AND r1.rn = 1
     LEFT JOIN ranked r2 ON r2.vehicle_id = v.id AND r2.rn = 2
     WHERE v.category = 'veiculo'
     ORDER BY v.plate ASC`
  ).all<VehicleWithReadings>();

  return NextResponse.json({ vehicles: result.results });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para atualizar hodometro." }, { status: 403 });
  }

  const { env } = getCloudflareContext();

  let input;
  try {
    const body = await request.json();
    input = parseOdometerReadingInput(body);
  } catch (err) {
    if (err instanceof OdometerValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const vehicle = await env.DB.prepare(
    `SELECT id, plate, category FROM vehicles WHERE id = ?`
  )
    .bind(input.vehicle_id)
    .first<{ id: number; plate: string | null; category: string }>();

  if (!vehicle) {
    return NextResponse.json({ error: "Veiculo nao encontrado." }, { status: 404 });
  }

  const last = await env.DB.prepare(
    `SELECT odometer, reading_date, source FROM odometer_readings
     WHERE vehicle_id = ? AND status = 'valido'
     ORDER BY reading_date DESC, id DESC LIMIT 1`
  )
    .bind(input.vehicle_id)
    .first<{ odometer: number; reading_date: string; source: string }>();

  if (last && input.odometer < last.odometer && !input.override) {
    return NextResponse.json(
      {
        error: "O hodometro informado e menor que o ultimo registro valido deste veiculo.",
        last_odometer: last.odometer,
        last_reading_date: last.reading_date,
        last_source: last.source,
        difference: last.odometer - input.odometer,
      },
      { status: 409 }
    );
  }
  if (last && input.odometer < last.odometer && input.override && user.role !== "admin") {
    return NextResponse.json(
      { error: "Somente administradores podem aprovar um hodometro menor que o anterior." },
      { status: 403 }
    );
  }
  if (last && input.odometer < last.odometer && input.override && !input.notes) {
    return NextResponse.json(
      { error: "Justificativa obrigatoria para aprovar um hodometro menor que o anterior." },
      { status: 400 }
    );
  }
  if (last && input.odometer === last.odometer && !input.notes) {
    return NextResponse.json(
      {
        error:
          "O hodometro informado e igual ao ultimo registro. Informe uma observacao (ex.: veiculo sem utilizacao, conferencia, correcao cadastral).",
      },
      { status: 400 }
    );
  }

  const deltaKm = last ? input.odometer - last.odometer : null;

  const reading = await env.DB.prepare(
    `INSERT INTO odometer_readings (
      vehicle_id, odometer, previous_odometer, delta_km, reading_date,
      reference_month, source, recorded_by, notes, status, override
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'valido', ?)
    RETURNING *`
  )
    .bind(
      input.vehicle_id,
      input.odometer,
      last?.odometer ?? null,
      deltaKm,
      input.reading_date,
      referenceMonth(input.reading_date),
      input.source,
      user.name,
      input.notes,
      input.override ? 1 : 0
    )
    .first<OdometerReading>();

  if (!last || input.reading_date >= last.reading_date) {
    await env.DB.prepare(
      `UPDATE vehicles SET odometer = ?, odometer_reference_date = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(input.odometer, input.reading_date, input.vehicle_id)
      .run();
  }

  return NextResponse.json({ reading }, { status: 201 });
}
