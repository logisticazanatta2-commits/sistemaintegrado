import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword, normalizeEmail, type UserRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface UserListRow {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  active: number;
  created_at: string;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(
    `SELECT id, email, name, role, active, created_at FROM app_users ORDER BY created_at ASC`
  ).all<UserListRow>();

  return NextResponse.json({ users: result.results });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corpo da requisicao invalido." }, { status: 400 });
  }
  const { name, email, password, role } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail invalido." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Senha precisa ter pelo menos 8 caracteres." },
      { status: 400 }
    );
  }
  if (role !== "admin" && role !== "viewer") {
    return NextResponse.json({ error: "Papel invalido." }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const passwordHash = await hashPassword(password);

  try {
    const created = await env.DB.prepare(
      `INSERT INTO app_users (email, name, password_hash, role, active)
       VALUES (?, ?, ?, ?, 1)
       RETURNING id, email, name, role, active, created_at`
    )
      .bind(normalizeEmail(email), name.trim(), passwordHash, role)
      .first<UserListRow>();

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ja existe um usuario com esse e-mail." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar usuario." }, { status: 500 });
  }
}
