import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ValidationError, parseWorkOrderInput, type WorkOrder } from "@/lib/work-orders";

export const dynamic = "force-dynamic";

const SELECT_WITH_VEHICLE = `
  SELECT
    wo.*,
    v.plate AS vehicle_plate,
    v.model AS vehicle_model,
    COALESCE((
      SELECT SUM(quantity * unit_cost_cents)
      FROM work_order_items
      WHERE work_order_id = wo.id
    ), 0) AS items_total_cents
  FROM work_orders wo
  JOIN vehicles v ON v.id = wo.vehicle_id
`;

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/work-orders/[id]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para editar OS." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const workOrderId = Number(id);
  if (!Number.isInteger(workOrderId)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  const { env } = getCloudflareContext();

  let input;
  try {
    const body = await request.json();
    input = parseWorkOrderInput(body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const vehicleExists = await env.DB.prepare("SELECT id FROM vehicles WHERE id = ?")
    .bind(input.vehicle_id)
    .first();
  if (!vehicleExists) {
    return NextResponse.json({ error: "Veiculo nao encontrado." }, { status: 400 });
  }

  const updated = await env.DB.prepare(
    `UPDATE work_orders SET
      vehicle_id = ?, status = ?, problem_description = ?, workshop = ?,
      requested_by = ?, approved_by = ?, payment_method = ?, final_cost_cents = ?,
      opened_at = COALESCE(?, opened_at), closed_at = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
    RETURNING id`
  )
    .bind(
      input.vehicle_id,
      input.status,
      input.problem_description,
      input.workshop,
      input.requested_by,
      input.approved_by,
      input.payment_method,
      input.final_cost_cents,
      input.opened_at,
      input.closed_at,
      input.notes,
      workOrderId
    )
    .first<{ id: number }>();

  if (!updated) {
    return NextResponse.json({ error: "OS nao encontrada." }, { status: 404 });
  }

  const result = await env.DB.prepare(`${SELECT_WITH_VEHICLE} WHERE wo.id = ?`)
    .bind(workOrderId)
    .first<WorkOrder>();

  return NextResponse.json({ workOrder: result });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/work-orders/[id]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para excluir OS." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const workOrderId = Number(id);
  if (!Number.isInteger(workOrderId)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  await env.DB.prepare("DELETE FROM work_orders WHERE id = ?").bind(workOrderId).run();

  return NextResponse.json({ ok: true });
}
