import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword, normalizeEmail, type FinesRole, type UserRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FINES_ROLES: FinesRole[] = ["admin_multas", "gestor_setor", "financeiro", "rh"];

interface UserListRow {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  active: number;
  created_at: string;
  fines_role: FinesRole | null;
  fines_department_id: number | null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(
    `SELECT id, email, name, role, active, created_at, fines_role, fines_department_id
     FROM app_users ORDER BY created_at ASC`
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
  const { name, email, password, role, fines_role, fines_department_id } = body as Record<string, unknown>;

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
  let finesRole: FinesRole | null = null;
  if (fines_role !== undefined && fines_role !== null && fines_role !== "") {
    if (typeof fines_role !== "string" || !FINES_ROLES.includes(fines_role as FinesRole)) {
      return NextResponse.json({ error: "Perfil de multas invalido." }, { status: 400 });
    }
    finesRole = fines_role as FinesRole;
  }
  const finesDepartmentId =
    fines_department_id !== undefined && fines_department_id !== null && fines_department_id !== ""
      ? Number(fines_department_id)
      : null;

  const { env } = getCloudflareContext();
  const passwordHash = await hashPassword(password);

  try {
    const created = await env.DB.prepare(
      `INSERT INTO app_users (email, name, password_hash, role, active, fines_role, fines_department_id)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       RETURNING id, email, name, role, active, created_at, fines_role, fines_department_id`
    )
      .bind(normalizeEmail(email), name.trim(), passwordHash, role, finesRole, finesDepartmentId)
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
