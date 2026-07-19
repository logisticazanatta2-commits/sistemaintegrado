import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { referenceMonth } from "@/lib/odometer";
import type { ExtractedDocument } from "@/lib/pdf-import";

export const dynamic = "force-dynamic";

const FINANCIAL_TO_WORK_ORDER_STATUS: Record<string, string> = {
  orcamento_recebido: "aguardando_orcamento",
  em_analise: "em_analise",
  aprovado: "aprovada",
  reprovado: "cancelada",
  em_manutencao: "em_execucao",
  concluido: "concluida",
  pago: "faturada",
  cancelado: "cancelada",
};

interface ImportRecord {
  id: number;
  vehicle_id: number | null;
  status: string;
  file_key: string;
  file_name: string;
  doc_number: string | null;
  os_number: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  service_date: string | null;
  supplier_name: string | null;
  supplier_document: string | null;
  responsible_name: string | null;
  odometer_extracted: number | null;
  observations: string | null;
  extracted_json: string;
  discount_cents: number | null;
  surcharge_cents: number | null;
  total_cents: number | null;
  total_calculated_cents: number | null;
  financial_status: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para confirmar importacoes." }, { status: 403 });
  }

  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const body = (await request.json().catch(() => ({}))) as { update_odometer?: boolean };

  const record = await env.DB.prepare(`SELECT * FROM maintenance_imports WHERE id = ?`)
    .bind(id)
    .first<ImportRecord>();

  if (!record) {
    return NextResponse.json({ error: "Importacao nao encontrada." }, { status: 404 });
  }
  if (record.status === "confirmado") {
    return NextResponse.json({ error: "Esta importacao ja foi confirmada." }, { status: 409 });
  }
  if (record.status === "cancelado") {
    return NextResponse.json({ error: "Esta importacao foi cancelada." }, { status: 409 });
  }
  if (!record.vehicle_id) {
    return NextResponse.json(
      { error: "Vincule a importacao a um veiculo cadastrado antes de confirmar." },
      { status: 400 }
    );
  }
  if (!record.issue_date && !record.service_date) {
    return NextResponse.json(
      { error: "Informe ao menos uma data (emissao ou atendimento) antes de confirmar." },
      { status: 400 }
    );
  }

  const extracted = JSON.parse(record.extracted_json) as ExtractedDocument;
  if (extracted.items.length === 0) {
    return NextResponse.json(
      { error: "Adicione ao menos um item (produto ou servico) antes de confirmar." },
      { status: 400 }
    );
  }

  const productsTotal = extracted.items
    .filter((i) => i.type === "produto")
    .reduce((sum, i) => sum + i.total_cents, 0);
  const servicesTotal = extracted.items
    .filter((i) => i.type === "servico")
    .reduce((sum, i) => sum + i.total_cents, 0);
  const calculatedTotal = productsTotal + servicesTotal - (record.discount_cents ?? 0) + (record.surcharge_cents ?? 0);

  const openedAt = record.service_date ?? record.issue_date!;
  const woStatus = FINANCIAL_TO_WORK_ORDER_STATUS[record.financial_status] ?? "aguardando_orcamento";
  const isClosed = record.financial_status === "concluido" || record.financial_status === "pago";

  const workOrder = await env.DB.prepare(
    `INSERT INTO work_orders (
      vehicle_id, status, problem_description, workshop, requested_by, approved_by,
      final_cost_cents, opened_at, closed_at, notes, maintenance_type, os_number,
      invoice_number, odometer_at_service, supplier_document, financial_status,
      products_total_cents, services_total_cents, discount_cents, surcharge_cents,
      source, import_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'importacao_pdf', ?)
    RETURNING id`
  )
    .bind(
      record.vehicle_id,
      woStatus,
      extracted.observations.join("\n") || "Importado de orcamento/OS em PDF.",
      record.supplier_name,
      record.responsible_name,
      user.name,
      calculatedTotal,
      openedAt,
      isClosed ? (record.service_date ?? record.issue_date) : null,
      `Importado do arquivo "${record.file_name}" por ${user.name}.`,
      "corretiva",
      record.os_number,
      record.invoice_number,
      record.odometer_extracted,
      record.supplier_document,
      record.financial_status,
      productsTotal,
      servicesTotal,
      record.discount_cents ?? 0,
      record.surcharge_cents ?? 0,
      id
    )
    .first<{ id: number }>();

  const workOrderId = workOrder!.id;

  const itemStatements = extracted.items.map((item) =>
    env.DB.prepare(
      `INSERT INTO work_order_items (work_order_id, description, quantity, unit_cost_cents, item_type, category)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      workOrderId,
      item.code ? `${item.code} - ${item.description}` : item.description,
      Math.max(1, Math.round(item.quantity)),
      item.quantity > 0 ? Math.round(item.total_cents / item.quantity) : item.total_cents,
      item.type,
      item.category
    )
  );
  await env.DB.batch(itemStatements);

  await env.DB.prepare(
    `UPDATE maintenance_imports SET
      status = 'confirmado', work_order_id = ?, confirmed_by = ?, confirmed_at = datetime('now'),
      updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(workOrderId, user.name, id)
    .run();

  let odometerUpdated = false;
  if (body.update_odometer && record.odometer_extracted) {
    const last = await env.DB.prepare(
      `SELECT odometer, reading_date FROM odometer_readings
       WHERE vehicle_id = ? AND status = 'valido' ORDER BY reading_date DESC, id DESC LIMIT 1`
    )
      .bind(record.vehicle_id)
      .first<{ odometer: number; reading_date: string }>();

    const readingDate = (record.service_date ?? record.issue_date)!;
    if (!last || record.odometer_extracted >= last.odometer) {
      await env.DB.prepare(
        `INSERT INTO odometer_readings (
          vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month,
          source, recorded_by, notes, status, override
        ) VALUES (?, ?, ?, ?, ?, ?, 'manutencao', ?, ?, 'valido', 0)`
      )
        .bind(
          record.vehicle_id,
          record.odometer_extracted,
          last?.odometer ?? null,
          last ? record.odometer_extracted - last.odometer : null,
          readingDate,
          referenceMonth(readingDate),
          user.name,
          `Orcamento/OS de manutencao (documento ${record.os_number ?? record.doc_number ?? record.file_name}).`
        )
        .run();

      if (!last || readingDate >= last.reading_date) {
        await env.DB.prepare(
          `UPDATE vehicles SET odometer = ?, odometer_reference_date = ?, updated_at = datetime('now') WHERE id = ?`
        )
          .bind(record.odometer_extracted, readingDate, record.vehicle_id)
          .run();
      }
      odometerUpdated = true;
    }
  }

  return NextResponse.json({ work_order_id: workOrderId, odometer_updated: odometerUpdated });
}
