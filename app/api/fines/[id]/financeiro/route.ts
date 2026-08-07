import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildHistoryEntries, canEditFinanceiro, FineValidationError, parseFineFinanceiroInput, type Fine } from "@/lib/fines";

export const dynamic = "force-dynamic";

const FIN_FIELDS = ["invoice_status", "amount_paid_cents", "due_date", "cigam_launch_number", "flow_financial_status"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  if (!canEditFinanceiro(user)) {
    return NextResponse.json({ error: "Sem permissao. Somente o Financeiro edita esta etapa." }, { status: 403 });
  }

  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const existing = await env.DB.prepare(`SELECT * FROM fines WHERE id = ?`).bind(id).first<Fine>();
  if (!existing) {
    return NextResponse.json({ error: "Multa nao encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON invalido." }, { status: 400 });

  let input;
  try {
    input = parseFineFinanceiroInput(body);
  } catch (err) {
    if (err instanceof FineValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao validar dados." }, { status: 400 });
  }

  // Se o pagamento completo foi confirmado, avanca automaticamente o status
  // (fim do calculo manual de "vencida"/"pago" que hoje depende do usuario lembrar).
  let nextStatus = existing.status;
  if (input.amount_paid_cents !== null && input.amount_paid_cents >= (existing.amount_cents ?? 0) && existing.status === "pagto_pendente") {
    nextStatus = "pagto_realizado";
  }

  const fine = await env.DB.prepare(
    `UPDATE fines SET
      invoice_status = ?, amount_paid_cents = ?, due_date = ?, cigam_launch_number = ?,
      flow_financial_status = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?
     RETURNING *`
  )
    .bind(input.invoice_status, input.amount_paid_cents, input.due_date, input.cigam_launch_number, input.flow_financial_status, nextStatus, id)
    .first<Fine>();

  if (fine) {
    const entries = buildHistoryEntries(existing as unknown as Record<string, unknown>, input as unknown as Record<string, unknown>, FIN_FIELDS);
    if (nextStatus !== existing.status) {
      entries.push({ field_label: "Status", old_value: existing.status, new_value: nextStatus });
    }
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
