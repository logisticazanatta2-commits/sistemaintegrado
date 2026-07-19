"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/badge";

type Role = "admin" | "viewer";

interface AppUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: number;
  created_at: string;
}

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  viewer: "Visualizador",
};

const EMPTY_FORM = { name: "", email: "", password: "", role: "viewer" as Role };

export default function UsersManager({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Falha ao carregar usuarios.");
      const data = (await res.json()) as { users: AppUser[] };
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadUsers, 0);
    return () => clearTimeout(timeout);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar usuario.");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: AppUser) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: u.active !== 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Erro ao atualizar usuario.");
      return;
    }
    await loadUsers();
  }

  async function changeRole(u: AppUser, role: Role) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Erro ao atualizar usuario.");
      return;
    }
    await loadUsers();
  }

  async function handleDelete(u: AppUser) {
    if (!confirm(`Excluir o acesso de "${u.name}" (${u.email})?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Nao foi possivel excluir o usuario.");
      return;
    }
    await loadUsers();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
          {users.length} usuario(s)
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Novo usuario
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center" style={{ color: "var(--text-faint)" }}>
                  Carregando...
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">
                    {u.name}
                    {u.id === currentUserId && (
                      <span style={{ color: "var(--text-faint)" }}> (voce)</span>
                    )}
                  </td>
                  <td className="mono">{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="input"
                      style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
                    >
                      {Object.entries(ROLE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Badge tone={u.active ? "ok" : "neutral"}>
                      {u.active ? "Ativo" : "Desativado"}
                    </Badge>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => toggleActive(u)} className="btn btn-ghost">
                      {u.active ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => handleDelete(u)} className="btn btn-danger-ghost">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreate}
            className="card w-full max-w-sm p-6 flex flex-col gap-3"
            style={{ background: "var(--surface)" }}
          >
            <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
              Novo usuario
            </h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <label className="flex flex-col gap-1 field-label">
              Nome
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 field-label">
              E-mail
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 field-label">
              Senha provisoria (minimo 8 caracteres)
              <input
                type="password"
                className="input"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 field-label">
              Papel
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
                className="btn btn-secondary mt-4"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary mt-4">
                {saving ? "Criando..." : "Criar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
