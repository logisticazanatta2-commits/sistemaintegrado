import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { FineValidationError, parseFineFlowInput, type Fine } from "@/lib/fines";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para atualizar o fluxo." }, { status: 403 });
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

  return NextResponse.json({ fine });
}
