"use client";

import { useEffect, useMemo, useState } from "react";
import type { Vehicle, VehicleCategory, VehicleStatus } from "@/lib/vehicles";

const CATEGORY_LABEL: Record<VehicleCategory, string> = {
  veiculo: "Veiculo",
  equipamento: "Equipamento",
  particular: "Particular",
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  disponivel: "Disponivel",
  em_uso: "Em uso",
  em_manutencao: "Em manutencao",
  bloqueado: "Bloqueado",
  inativo: "Inativo",
};

const EMPTY_FORM = {
  category: "veiculo" as VehicleCategory,
  plate: "",
  registered_plate: "",
  model: "",
  vehicle_type: "",
  nickname: "",
  responsible: "",
  cost_center: "",
  status: "disponivel" as VehicleStatus,
  asset_code: "",
  renavam: "",
  chassis: "",
  manufacture_year: "",
  model_year: "",
  owner_name: "",
  odometer: "",
  uf_base: "",
  fleet_class: "",
  notes: "",
};

type FormState = typeof EMPTY_FORM;

export default function VehiclesManager({ canEdit }: { canEdit: boolean }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"" | VehicleCategory>("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadVehicles() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/vehicles?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao carregar veiculos.");
      const data = (await res.json()) as { vehicles: Vehicle[] };
      setVehicles(data.vehicles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadVehicles, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, search]);

  const counts = useMemo(() => {
    return vehicles.reduce<Record<string, number>>((acc, v) => {
      acc[v.category] = (acc[v.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [vehicles]);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(v: Vehicle) {
    setEditingId(v.id);
    setForm({
      category: v.category,
      plate: v.plate ?? "",
      registered_plate: v.registered_plate ?? "",
      model: v.model,
      vehicle_type: v.vehicle_type ?? "",
      nickname: v.nickname ?? "",
      responsible: v.responsible ?? "",
      cost_center: v.cost_center ?? "",
      status: v.status,
      asset_code: v.asset_code ?? "",
      renavam: v.renavam ?? "",
      chassis: v.chassis ?? "",
      manufacture_year: v.manufacture_year?.toString() ?? "",
      model_year: v.model_year?.toString() ?? "",
      owner_name: v.owner_name ?? "",
      odometer: v.odometer.toString(),
      uf_base: v.uf_base ?? "",
      fleet_class: v.fleet_class ?? "",
      notes: v.notes ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const url = editingId ? `/api/vehicles/${editingId}` : "/api/vehicles";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao salvar veiculo.");
      }
      setShowForm(false);
      await loadVehicles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: Vehicle) {
    if (!confirm(`Excluir "${v.model}" (${v.plate ?? v.asset_code ?? v.id})?`)) return;
    const res = await fetch(`/api/vehicles/${v.id}`, { method: "DELETE" });
    if (res.ok) {
      await loadVehicles();
    } else {
      alert("Nao foi possivel excluir o veiculo.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as VehicleCategory | "")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Todas as categorias</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Buscar por placa, modelo, apelido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-64 bg-white"
          />
        </div>
        {canEdit && (
          <button
            onClick={openCreateForm}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            + Novo veiculo
          </button>
        )}
      </div>

      <div className="text-xs text-slate-500">
        {vehicles.length} registro(s)
        {Object.entries(counts).length > 0 && (
          <>
            {" "}
            (
            {Object.entries(counts)
              .map(([cat, n]) => `${CATEGORY_LABEL[cat as VehicleCategory]}: ${n}`)
              .join(" | ")}
            )
          </>
        )}
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
              <th className="px-3 py-2">Placa</th>
              <th className="px-3 py-2">Modelo</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Responsavel</th>
              <th className="px-3 py-2">UF/Base</th>
              <th className="px-3 py-2">Hodometro</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && vehicles.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                  Nenhum veiculo cadastrado.
                </td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono">{v.plate ?? v.asset_code ?? "-"}</td>
                <td className="px-3 py-2">
                  {v.model}
                  {v.nickname && <span className="text-slate-400"> ({v.nickname})</span>}
                </td>
                <td className="px-3 py-2">{CATEGORY_LABEL[v.category]}</td>
                <td className="px-3 py-2">{v.responsible ?? "-"}</td>
                <td className="px-3 py-2">{v.uf_base ?? "-"}</td>
                <td className="px-3 py-2">{v.odometer.toLocaleString("pt-BR")} km</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {STATUS_LABEL[v.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => openEditForm(v)}
                        className="text-slate-600 hover:text-slate-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(v)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4"
          >
            <h2 className="text-lg font-semibold">
              {editingId ? "Editar veiculo" : "Novo veiculo"}
            </h2>

            {formError && (
              <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as VehicleCategory })
                  }
                  className="input"
                >
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as VehicleStatus })
                  }
                  className="input"
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Placa">
                <input
                  className="input"
                  value={form.plate}
                  onChange={(e) => setForm({ ...form, plate: e.target.value })}
                  placeholder="ABC1D23"
                />
              </Field>
              <Field label="Modelo *">
                <input
                  className="input"
                  required
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </Field>
              <Field label="Tipo">
                <input
                  className="input"
                  value={form.vehicle_type}
                  onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                />
              </Field>
              <Field label="Apelido">
                <input
                  className="input"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                />
              </Field>
              <Field label="Responsavel">
                <input
                  className="input"
                  value={form.responsible}
                  onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                />
              </Field>
              <Field label="Centro de custo / Local">
                <input
                  className="input"
                  value={form.cost_center}
                  onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
                />
              </Field>
              <Field label="UF / Base">
                <input
                  className="input"
                  value={form.uf_base}
                  onChange={(e) => setForm({ ...form, uf_base: e.target.value })}
                />
              </Field>
              <Field label="Classe de frota">
                <input
                  className="input"
                  value={form.fleet_class}
                  onChange={(e) => setForm({ ...form, fleet_class: e.target.value })}
                  placeholder="Ex: VEICULO LEVE, PTA, BOBCAT"
                />
              </Field>
              <Field label="Hodometro (km)">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.odometer}
                  onChange={(e) => setForm({ ...form, odometer: e.target.value })}
                />
              </Field>
              <Field label="Codigo patrimonial">
                <input
                  className="input"
                  value={form.asset_code}
                  onChange={(e) => setForm({ ...form, asset_code: e.target.value })}
                />
              </Field>
              <Field label="RENAVAM">
                <input
                  className="input"
                  value={form.renavam}
                  onChange={(e) => setForm({ ...form, renavam: e.target.value })}
                />
              </Field>
              <Field label="Chassi">
                <input
                  className="input"
                  value={form.chassis}
                  onChange={(e) => setForm({ ...form, chassis: e.target.value })}
                />
              </Field>
              <Field label="Ano fabricacao">
                <input
                  type="number"
                  className="input"
                  value={form.manufacture_year}
                  onChange={(e) => setForm({ ...form, manufacture_year: e.target.value })}
                />
              </Field>
              <Field label="Ano modelo">
                <input
                  type="number"
                  className="input"
                  value={form.model_year}
                  onChange={(e) => setForm({ ...form, model_year: e.target.value })}
                />
              </Field>
              <Field label="Proprietario">
                <input
                  className="input"
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Observacoes">
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-4 py-1.5 text-sm border border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {label}
      {children}
    </label>
  );
}
