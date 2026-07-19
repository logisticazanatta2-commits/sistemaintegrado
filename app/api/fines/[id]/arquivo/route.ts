import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const id = Number((await params).id);

  const record = await env.DB.prepare(`SELECT file_key, file_name FROM fines WHERE id = ?`)
    .bind(id)
    .first<{ file_key: string | null; file_name: string | null }>();

  if (!record || !record.file_key) {
    return NextResponse.json({ error: "Nenhum arquivo anexado a esta multa." }, { status: 404 });
  }

  const object = await env.BUCKET.get(record.file_key);
  if (!object) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }

  return new NextResponse(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${(record.file_name ?? "multa.pdf").replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
