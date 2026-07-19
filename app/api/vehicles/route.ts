import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError, parseVehicleInput, type Vehicle } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("q")?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (search) {
    conditions.push("(plate LIKE ? OR model LIKE ? OR nickname LIKE ? OR asset_code LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const stmt = env.DB.prepare(
    `SELECT * FROM vehicles ${where} ORDER BY created_at DESC LIMIT 500`
  ).bind(...params);

  const result = await stmt.all<Vehicle>();
  return NextResponse.json({ vehicles: result.results });
}

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();

  let input;
  try {
    const body = await request.json();
    input = parseVehicleInput(body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(
      `INSERT INTO vehicles (
        category, plate, registered_plate, model, vehicle_type, nickname,
        responsible, cost_center, status, asset_code, renavam, chassis,
        manufacture_year, model_year, owner_name, odometer,
        odometer_reference_date, uf_base, fleet_class, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`
    )
      .bind(
        input.category,
        input.plate,
        input.registered_plate,
        input.model,
        input.vehicle_type,
        input.nickname,
        input.responsible,
        input.cost_center,
        input.status,
        input.asset_code,
        input.renavam,
        input.chassis,
        input.manufacture_year,
        input.model_year,
        input.owner_name,
        input.odometer,
        input.odometer_reference_date,
        input.uf_base,
        input.fleet_class,
        input.notes
      )
      .first<Vehicle>();

    return NextResponse.json({ vehicle: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Placa ou codigo patrimonial ja cadastrado." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erro ao criar veiculo." }, { status: 500 });
  }
}
