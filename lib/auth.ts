import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type UserRole = "admin" | "viewer";
export type FinesRole = "admin_multas" | "gestor_setor" | "financeiro" | "rh";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  fines_role: FinesRole | null;
  fines_department_id: number | null;
}

export const SESSION_COOKIE = "sigf_session";
const SESSION_TTL_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.slice().buffer, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const iterations = Number(parts[0]);
  const salt = fromHex(parts[1]);
  const expected = fromHex(parts[2]);
  if (!Number.isFinite(iterations) || salt.length === 0 || expected.length === 0) return false;
  const actual = await pbkdf2(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  active: number;
  failed_attempts: number;
  locked_until: string | null;
  fines_role: FinesRole | null;
  fines_department_id: number | null;
}

export type LoginResult =
  | { ok: true; user: SessionUser; token: string }
  | { ok: false; error: string; status: number };

export async function attemptLogin(email: string, password: string): Promise<LoginResult> {
  const { env } = getCloudflareContext();
  const normalized = normalizeEmail(email);

  const row = await env.DB.prepare(
    `SELECT id, email, name, password_hash, role, active, failed_attempts, locked_until,
            fines_role, fines_department_id
     FROM app_users WHERE email = ?`
  )
    .bind(normalized)
    .first<UserRow>();

  const genericError = { ok: false as const, error: "E-mail ou senha invalidos.", status: 401 };

  if (!row) return genericError;

  if (row.locked_until && row.locked_until > new Date().toISOString()) {
    return {
      ok: false,
      error: "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em alguns minutos.",
      status: 429,
    };
  }

  if (!row.active) {
    return { ok: false, error: "Conta desativada. Fale com um administrador.", status: 403 };
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    const attempts = row.failed_attempts + 1;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
      await env.DB.prepare(
        `UPDATE app_users SET failed_attempts = ?, locked_until = ? WHERE id = ?`
      )
        .bind(attempts, lockedUntil, row.id)
        .run();
    } else {
      await env.DB.prepare(`UPDATE app_users SET failed_attempts = ? WHERE id = ?`)
        .bind(attempts, row.id)
        .run();
    }
    return genericError;
  }

  await env.DB.prepare(
    `UPDATE app_users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`
  )
    .bind(row.id)
    .run();

  const token = await createSession(row.id);

  return {
    ok: true,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      fines_role: row.fines_role,
      fines_department_id: row.fines_department_id,
    },
    token,
  };
}

export async function createSession(userId: number): Promise<string> {
  const { env } = getCloudflareContext();
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60_000).toISOString();

  await env.DB.prepare(
    `INSERT INTO app_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
  )
    .bind(userId, tokenHash, expiresAt)
    .run();

  return token;
}

export async function destroySession(token: string): Promise<void> {
  const { env } = getCloudflareContext();
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare(`DELETE FROM app_sessions WHERE token_hash = ?`).bind(tokenHash).run();
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { env } = getCloudflareContext();
  const tokenHash = await sha256Hex(token);

  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.fines_role, u.fines_department_id
     FROM app_sessions s
     JOIN app_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.active = 1`
  )
    .bind(tokenHash)
    .first<SessionUser>();

  return row ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const PUBLIC_VIEWER: SessionUser = {
  id: 0,
  email: "",
  name: "Visitante",
  role: "viewer",
  fines_role: null,
  fines_department_id: null,
};

export function isPublicViewer(user: SessionUser): boolean {
  return user.id === 0;
}

// Usado nas telas de consulta (veiculos, hodometro, manutencao, multas):
// visitantes sem login veem os dados em modo somente-leitura. Nunca usar
// isto para telas administrativas (ex: gestao de usuarios).
export async function requireUserOrPublic(): Promise<SessionUser> {
  const user = await getCurrentUser();
  return user ?? PUBLIC_VIEWER;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/veiculos");
  return user;
}

export async function countUsers(): Promise<number> {
  const { env } = getCloudflareContext();
  const row = await env.DB.prepare(`SELECT COUNT(*) as n FROM app_users`).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function countActiveAdmins(excludeUserId?: number): Promise<number> {
  const { env } = getCloudflareContext();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as n FROM app_users WHERE role = 'admin' AND active = 1 AND id != ?`
  )
    .bind(excludeUserId ?? -1)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;
