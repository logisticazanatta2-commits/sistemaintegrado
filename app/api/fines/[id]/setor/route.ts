import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildHistoryEntries, canEditSetor, FineValidationError, parseFineSetorInput, type Fine } from "@/lib/fines";

export const dynamic = "force-dynamic";

const SETOR_FIELDS = ["driver_name", "identification_method", "form_sent_date", "form_received_by", "protocol_date"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const existing = await env.DB.prepare(`SELECT * FROM fines WHERE id = ?`).bind(id).first<Fine>();
  if (!existing) {
    return NextResponse.json({ error: "Multa nao encontrada." }, { status: 404 });
  }
  if (!canEditSetor(user, existing)) {
    return NextResponse.json(
      { error: "Sem permissao. Somente o Gestor do setor responsavel por esta multa pode editar a indicacao do condutor." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON invalido." }, { status: 400 });

  let input;
  try {
    input = parseFineSetorInput(body);
  } catch (err) {
    if (err instanceof FineValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao validar dados." }, { status: 400 });
  }

  const fine = await env.DB.prepare(
    `UPDATE fines SET
      driver_name = ?, identification_method = ?, form_sent_date = ?, form_received_by = ?, protocol_date = ?,
      updated_at = datetime('now')
     WHERE id = ?
     RETURNING *`
  )
    .bind(input.driver_name, input.identification_method, input.form_sent_date, input.form_received_by, input.protocol_date, id)
    .first<Fine>();

  if (fine) {
    const entries = buildHistoryEntries(existing as unknown as Record<string, unknown>, input as unknown as Record<string, unknown>, SETOR_FIELDS);
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
