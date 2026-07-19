import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { countActiveAdmins, getCurrentUser, hashPassword, type UserRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface UserRow {
  id: number;
  email: string;
  role: UserRole;
  active: number;
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/users/[id]">
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  if (currentUser.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corpo da requisicao invalido." }, { status: 400 });
  }
  const { role, active, password } = body as Record<string, unknown>;

  const { env } = getCloudflareContext();
  const target = await env.DB.prepare(
    `SELECT id, email, role, active FROM app_users WHERE id = ?`
  )
    .bind(userId)
    .first<UserRow>();

  if (!target) {
    return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
  }

  const willDemote = typeof role === "string" && role !== "admin" && target.role === "admin";
  const willDeactivate = active === false && target.active === 1;

  if ((willDemote || willDeactivate) && userId === currentUser.id) {
    return NextResponse.json(
      { error: "Voce nao pode remover seu proprio acesso de administrador." },
      { status: 400 }
    );
  }

  if ((willDemote || willDeactivate) && target.role === "admin") {
    const otherAdmins = await countActiveAdmins(userId);
    if (otherAdmins === 0) {
      return NextResponse.json(
        { error: "Precisa existir pelo menos um administrador ativo." },
        { status: 400 }
      );
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof role === "string") {
    if (role !== "admin" && role !== "viewer") {
      return NextResponse.json({ error: "Papel invalido." }, { status: 400 });
    }
    updates.push("role = ?");
    values.push(role);
  }
  if (typeof active === "boolean") {
    updates.push("active = ?");
    values.push(active ? 1 : 0);
  }
  if (typeof password === "string" && password.length > 0) {
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Senha precisa ter pelo menos 8 caracteres." },
        { status: 400 }
      );
    }
    updates.push("password_hash = ?");
    values.push(await hashPassword(password));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  values.push(userId);

  const updated = await env.DB.prepare(
    `UPDATE app_users SET ${updates.join(", ")} WHERE id = ?
     RETURNING id, email, name, role, active, created_at`
  )
    .bind(...values)
    .first();

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/users/[id]">
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  if (currentUser.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  if (userId === currentUser.id) {
    return NextResponse.json(
      { error: "Voce nao pode excluir seu proprio usuario." },
      { status: 400 }
    );
  }

  const { env } = getCloudflareContext();
  const target = await env.DB.prepare(`SELECT role, active FROM app_users WHERE id = ?`)
    .bind(userId)
    .first<UserRow>();

  if (!target) {
    return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
  }

  if (target.role === "admin" && target.active === 1) {
    const otherAdmins = await countActiveAdmins(userId);
    if (otherAdmins === 0) {
      return NextResponse.json(
        { error: "Precisa existir pelo menos um administrador ativo." },
        { status: 400 }
      );
    }
  }

  await env.DB.prepare(`DELETE FROM app_users WHERE id = ?`).bind(userId).run();

  return NextResponse.json({ ok: true });
}
