import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type { InfractionCatalogEntry } from "@/lib/infractions";

export const dynamic = "force-dynamic";

export async function GET() {
  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(
    `SELECT code, description, points, base_amount_cents, source FROM infraction_catalog ORDER BY code ASC`
  ).all<InfractionCatalogEntry>();

  return NextResponse.json({ infractions: result.results });
}
