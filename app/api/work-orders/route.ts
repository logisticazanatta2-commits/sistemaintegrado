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

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const vehicleId = searchParams.get("vehicle_id");
  const maintenanceType = searchParams.get("maintenance_type");

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    conditions.push("wo.status = ?");
    params.push(status);
  }
  if (vehicleId) {
    conditions.push("wo.vehicle_id = ?");
    params.push(Number(vehicleId));
  }
  if (maintenanceType) {
    conditions.push("wo.maintenance_type = ?");
    params.push(maintenanceType);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const stmt = env.DB.prepare(
    `${SELECT_WITH_VEHICLE} ${where} ORDER BY wo.opened_at DESC LIMIT 2000`
  ).bind(...params);

  const result = await stmt.all<WorkOrder>();
  return NextResponse.json({ workOrders: result.results });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para abrir OS." }, { status: 403 });
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

  const created = await env.DB.prepare(
    `INSERT INTO work_orders (
      vehicle_id, status, problem_description, workshop, requested_by,
      approved_by, payment_method, final_cost_cents, opened_at, closed_at, notes,
      maintenance_type, os_number, invoice_number, payment_term, project_client,
      odometer_at_service
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), ?, ?, ?, ?, ?, ?, ?, ?)
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
      input.maintenance_type,
      input.os_number,
      input.invoice_number,
      input.payment_term,
      input.project_client,
      input.odometer_at_service
    )
    .first<{ id: number }>();

  const result = await env.DB.prepare(`${SELECT_WITH_VEHICLE} WHERE wo.id = ?`)
    .bind(created?.id)
    .first<WorkOrder>();

  return NextResponse.json({ workOrder: result }, { status: 201 });
}
