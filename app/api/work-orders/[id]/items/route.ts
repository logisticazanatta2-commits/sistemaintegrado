import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ValidationError, parseWorkOrderItemInput, type WorkOrderItem } from "@/lib/work-orders";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/work-orders/[id]/items">
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

  const workOrder = await env.DB.prepare("SELECT id FROM work_orders WHERE id = ?")
    .bind(workOrderId)
    .first();
  if (!workOrder) {
    return NextResponse.json({ error: "OS nao encontrada." }, { status: 404 });
  }

  let input;
  try {
    const body = await request.json();
    input = parseWorkOrderItemInput(body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const item = await env.DB.prepare(
    `INSERT INTO work_order_items (work_order_id, description, quantity, unit_cost_cents)
     VALUES (?, ?, ?, ?)
     RETURNING *`
  )
    .bind(workOrderId, input.description, input.quantity, input.unit_cost_cents)
    .first<WorkOrderItem>();

  return NextResponse.json({ item }, { status: 201 });
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/work-orders/[id]/items">
) {
  const { id } = await ctx.params;
  const workOrderId = Number(id);
  if (!Number.isInteger(workOrderId)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(
    "SELECT * FROM work_order_items WHERE work_order_id = ? ORDER BY created_at ASC"
  )
    .bind(workOrderId)
    .all<WorkOrderItem>();

  return NextResponse.json({ items: result.results });
}
