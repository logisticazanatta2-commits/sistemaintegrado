import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildHistoryEntries, canEditOfficialData, FineValidationError, parseFineFlowInput, type Fine } from "@/lib/fines";

export const dynamic = "force-dynamic";

const FLOW_FIELDS = [
  "department", "flow_responsible_name", "flow_responsible_email", "flow_responsible_status",
  "flow_department_status", "flow_rh_status", "discount_method", "discount_installments",
  "discount_completion_date", "flow_financial_status", "cigam_launch_number", "notes",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (!canEditOfficialData(user)) {
    return NextResponse.json({ error: "Sem permissao para atualizar o fluxo. Use as telas de Setor/Financeiro/RH." }, { status: 403 });
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
    input = parseFineFlowInput(body);
  } catch (err) {
    if (err instanceof FineValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao validar dados." }, { status: 400 });
  }

  const fine = await env.DB.prepare(
    `UPDATE fines SET
      department = ?, flow_responsible_name = ?, flow_responsible_email = ?,
      flow_responsible_status = ?, flow_department_status = ?, flow_rh_status = ?,
      discount_method = ?, discount_installments = ?, discount_completion_date = ?,
      flow_financial_status = ?, cigam_launch_number = ?, notes = ?,
      updated_at = datetime('now')
     WHERE id = ?
     RETURNING *`
  )
    .bind(
      input.department,
      input.flow_responsible_name,
      input.flow_responsible_email,
      input.flow_responsible_status,
      input.flow_department_status,
      input.flow_rh_status,
      input.discount_method,
      input.discount_installments,
      input.discount_completion_date,
      input.flow_financial_status,
      input.cigam_launch_number,
      input.notes,
      id
    )
    .first<Fine>();

  if (fine) {
    const entries = buildHistoryEntries(existing as unknown as Record<string, unknown>, input as unknown as Record<string, unknown>, FLOW_FIELDS);
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
