"use client";

import { useEffect, useState } from "react";

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
        <div className="text-xs text-slate-500">{users.length} usuario(s)</div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Novo usuario
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Papel</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="text-slate-400"> (voce)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">{u.email}</td>
                  <td className="px-3 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="input py-1"
                    >
                      {Object.entries(ROLE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.active ? "Ativo" : "Desativado"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(u)}
                      className="text-slate-600 hover:text-slate-900 mr-3"
                    >
                      {u.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-red-600 hover:text-red-800"
                    >
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
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 flex flex-col gap-3"
          >
            <h2 className="text-lg font-semibold">Novo usuario</h2>

            {formError && (
              <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">
                {formError}
              </div>
            )}

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Nome
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              E-mail
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
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
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-md px-4 py-1.5 text-sm border border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Criando..." : "Criar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
