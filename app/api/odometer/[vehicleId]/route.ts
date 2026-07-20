import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import type { OdometerReading } from "@/lib/odometer";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await params;
  const id = Number(vehicleId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Veiculo invalido." }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(
    `SELECT * FROM odometer_readings WHERE vehicle_id = ? ORDER BY reading_date DESC, id DESC LIMIT 200`
  )
    .bind(id)
    .all<OdometerReading>();

  return NextResponse.json({ readings: result.results });
}
