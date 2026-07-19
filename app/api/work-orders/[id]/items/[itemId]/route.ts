import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/work-orders/[id]/items/[itemId]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao para editar OS." }, { status: 403 });
  }

  const { id, itemId } = await ctx.params;
  const workOrderId = Number(id);
  const itemIdNum = Number(itemId);
  if (!Number.isInteger(workOrderId) || !Number.isInteger(itemIdNum)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  await env.DB.prepare("DELETE FROM work_order_items WHERE id = ? AND work_order_id = ?")
    .bind(itemIdNum, workOrderId)
    .run();

  return NextResponse.json({ ok: true });
}
