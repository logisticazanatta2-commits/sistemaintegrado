import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface DepartmentRow {
  id: number;
  name: string;
  active: number;
}

export async function GET() {
  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(
    `SELECT id, name, active FROM departments WHERE active = 1 ORDER BY name ASC`
  ).all<DepartmentRow>();

  return NextResponse.json({ departments: result.results });
}
