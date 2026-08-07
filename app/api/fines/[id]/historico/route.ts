import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface HistoryRow {
  id: number;
  fine_id: number;
  user_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// Leitura publica, como o restante da consulta de multas.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const result = await env.DB.prepare(
    `SELECT * FROM fine_history WHERE fine_id = ? ORDER BY created_at DESC, id DESC`
  )
    .bind(id)
    .all<HistoryRow>();

  return NextResponse.json({ history: result.results });
}
