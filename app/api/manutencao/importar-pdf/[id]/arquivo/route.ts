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

  const record = await env.DB.prepare(
    `SELECT file_key, file_name FROM maintenance_imports WHERE id = ?`
  )
    .bind(id)
    .first<{ file_key: string; file_name: string }>();

  if (!record) {
    return NextResponse.json({ error: "Importacao nao encontrada." }, { status: 404 });
  }

  const object = await env.BUCKET.get(record.file_key);
  if (!object) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }

  return new NextResponse(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${record.file_name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
