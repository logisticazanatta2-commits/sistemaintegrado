import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1PreparedStatement } from "@cloudflare/workers-types";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ODOMETER_SOURCES, referenceMonth, type OdometerSource } from "@/lib/odometer";
import { normalizePlate } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

interface ImportRow {
  plate: string;
  odometer: number;
  reading_date: string;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para importar hodometro." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray((body as Record<string, unknown>).rows)) {
    return NextResponse.json({ error: "Envie { rows: [...] }." }, { status: 400 });
  }
  const rawRows = (body as Record<string, unknown>).rows as unknown[];
  const source = ODOMETER_SOURCES.includes((body as Record<string, unknown>).source as OdometerSource)
    ? ((body as Record<string, unknown>).source as OdometerSource)
    : "importacao";

  const today = new Date().toISOString().slice(0, 10);
  const rows: ImportRow[] = [];
  const invalidRows: { row: unknown; reason: string }[] = [];

  for (const raw of rawRows) {
    if (typeof raw !== "object" || raw === null) {
      invalidRows.push({ row: raw, reason: "Linha invalida." });
      continue;
    }
    const r = raw as Record<string, unknown>;
    const plate = typeof r.plate === "string" ? r.plate.trim() : "";
    const odometer = Number(r.odometer);
    const readingDate = typeof r.reading_date === "string" ? r.reading_date.trim() : "";

    if (!plate) {
      invalidRows.push({ row: raw, reason: "Placa vazia." });
      continue;
    }
    if (!Number.isFinite(odometer) || odometer <= 0) {
      invalidRows.push({ row: raw, reason: "Hodometro vazio, zero ou invalido." });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(readingDate)) {
      invalidRows.push({ row: raw, reason: "Data invalida." });
      continue;
    }
    if (readingDate > today) {
      invalidRows.push({ row: raw, reason: "Data no futuro." });
      continue;
    }
    rows.push({ plate, odometer: Math.round(odometer), reading_date: readingDate });
  }

  const { env } = getCloudflareContext();

  const fleetVehicles = await env.DB.prepare(
    `SELECT id, plate, model FROM vehicles WHERE category = 'veiculo'`
  ).all<{ id: number; plate: string | null; model: string }>();

  const plateToVehicle = new Map<string, { id: number; plate: string | null; model: string }>();
  for (const v of fleetVehicles.results) {
    if (v.plate) plateToVehicle.set(normalizePlate(v.plate), v);
  }

  const lastReadings = await env.DB.prepare(
    `SELECT vehicle_id, odometer, reading_date FROM odometer_readings r
     WHERE status = 'valido' AND id = (
       SELECT id FROM odometer_readings r2
       WHERE r2.vehicle_id = r.vehicle_id AND r2.status = 'valido'
       ORDER BY reading_date DESC, id DESC LIMIT 1
     )`
  ).all<{ vehicle_id: number; odometer: number; reading_date: string }>();
  const lastByVehicle = new Map<number, { vehicle_id: number; odometer: number; reading_date: string }>();
  for (const r of lastReadings.results) {
    lastByVehicle.set(r.vehicle_id, r);
  }

  const notFound: { plate: string; odometer: number; reading_date: string }[] = [];
  const rejected: { plate: string; odometer: number; reason: string }[] = [];
  const duplicatePlates = new Set<string>();
  const seenInBatch = new Set<string>();
  const statements: D1PreparedStatement[] = [];
  const matchedVehicleIds = new Set<number>();
  let importedCount = 0;

  for (const row of rows) {
    const norm = normalizePlate(row.plate);
    if (seenInBatch.has(norm)) {
      duplicatePlates.add(row.plate);
      continue;
    }
    seenInBatch.add(norm);

    const vehicle = plateToVehicle.get(norm);
    if (!vehicle) {
      notFound.push(row);
      continue;
    }

    const last = lastByVehicle.get(vehicle.id);
    if (last && row.odometer < last.odometer) {
      rejected.push({
        plate: row.plate,
        odometer: row.odometer,
        reason: `Menor que o ultimo registro valido (${last.odometer.toLocaleString("pt-BR")} km em ${last.reading_date}).`,
      });
      continue;
    }

    matchedVehicleIds.add(vehicle.id);
    const deltaKm = last ? row.odometer - last.odometer : null;

    statements.push(
      env.DB.prepare(
        `INSERT INTO odometer_readings (
          vehicle_id, odometer, previous_odometer, delta_km, reading_date,
          reference_month, source, recorded_by, notes, status, override
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'valido', 0)`
      ).bind(
        vehicle.id,
        row.odometer,
        last?.odometer ?? null,
        deltaKm,
        row.reading_date,
        referenceMonth(row.reading_date),
        source,
        user.name
      )
    );

    if (!last || row.reading_date >= last.reading_date) {
      statements.push(
        env.DB.prepare(
          `UPDATE vehicles SET odometer = ?, odometer_reference_date = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(row.odometer, row.reading_date, vehicle.id)
      );
    }
    importedCount += 1;
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  const missing: { plate: string | null; model: string }[] = [];
  for (const v of fleetVehicles.results) {
    if (!matchedVehicleIds.has(v.id)) {
      missing.push({ plate: v.plate, model: v.model });
    }
  }

  return NextResponse.json({
    fleet_total: fleetVehicles.results.length,
    rows_received: rawRows.length,
    imported: importedCount,
    invalid: invalidRows,
    not_found: notFound,
    rejected,
    duplicate_plates: Array.from(duplicatePlates),
    missing,
  });
}
