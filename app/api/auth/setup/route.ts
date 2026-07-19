import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  countUsers,
  createSession,
  hashPassword,
  normalizeEmail,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const existing = await countUsers();
  if (existing > 0) {
    return NextResponse.json(
      { error: "O sistema ja foi configurado. Peca acesso a um administrador." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corpo da requisicao invalido." }, { status: 400 });
  }
  const { name, email, password } = body as Record<string, unknown>;

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

  const { env } = getCloudflareContext();
  const passwordHash = await hashPassword(password);
  const normalizedEmail = normalizeEmail(email);

  const user = await env.DB.prepare(
    `INSERT INTO app_users (email, name, password_hash, role, active)
     VALUES (?, ?, ?, 'admin', 1)
     RETURNING id, email, name, role`
  )
    .bind(normalizedEmail, name.trim(), passwordHash)
    .first<{ id: number; email: string; name: string; role: string }>();

  if (!user) {
    return NextResponse.json({ error: "Erro ao criar administrador." }, { status: 500 });
  }

  const token = await createSession(user.id);

  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
