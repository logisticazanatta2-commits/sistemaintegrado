import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ValidationError, parseVehicleInput, type Vehicle } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/vehicles/[id]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para editar veiculos." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const vehicleId = Number(id);
  if (!Number.isInteger(vehicleId)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

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
      `UPDATE vehicles SET
        category = ?, plate = ?, registered_plate = ?, model = ?, vehicle_type = ?,
        nickname = ?, responsible = ?, cost_center = ?, status = ?, asset_code = ?,
        renavam = ?, chassis = ?, manufacture_year = ?, model_year = ?, owner_name = ?,
        odometer = ?, odometer_reference_date = ?, uf_base = ?, fleet_class = ?,
        notes = ?, updated_at = datetime('now')
      WHERE id = ?
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
        input.notes,
        vehicleId
      )
      .first<Vehicle>();

    if (!result) {
      return NextResponse.json({ error: "Veiculo nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ vehicle: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Placa ou codigo patrimonial ja cadastrado." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erro ao atualizar veiculo." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/vehicles/[id]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para excluir veiculos." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const vehicleId = Number(id);
  if (!Number.isInteger(vehicleId)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  await env.DB.prepare("DELETE FROM vehicles WHERE id = ?").bind(vehicleId).run();

  return NextResponse.json({ ok: true });
}
