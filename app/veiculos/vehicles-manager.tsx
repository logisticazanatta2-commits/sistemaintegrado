"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { VEHICLE_STATUS_TONE, type Vehicle, type VehicleCategory, type VehicleStatus } from "@/lib/vehicles";

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
            className="input"
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
            className="input w-64"
          />
        </div>
        {canEdit && (
          <button onClick={openCreateForm} className="btn btn-primary">
            + Novo veiculo
          </button>
        )}
      </div>

      <div className="text-xs" style={{ color: "var(--text-faint)" }}>
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

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Modelo</th>
              <th>Categoria</th>
              <th>Responsavel</th>
              <th>UF/Base</th>
              <th>Hodometro</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center" style={{ color: "var(--text-faint)" }}>
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && vehicles.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center" style={{ color: "var(--text-faint)" }}>
                  Nenhum veiculo cadastrado.
                </td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td className="mono font-medium">{v.plate ?? v.asset_code ?? "-"}</td>
                <td>
                  {v.model}
                  {v.nickname && (
                    <span style={{ color: "var(--text-faint)" }}> ({v.nickname})</span>
                  )}
                </td>
                <td style={{ color: "var(--text-dim)" }}>{CATEGORY_LABEL[v.category]}</td>
                <td style={{ color: "var(--text-dim)" }}>{v.responsible ?? "-"}</td>
                <td style={{ color: "var(--text-dim)" }}>{v.uf_base ?? "-"}</td>
                <td className="mono">{v.odometer.toLocaleString("pt-BR")} km</td>
                <td>
                  <Badge tone={VEHICLE_STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                </td>
                <td className="text-right whitespace-nowrap">
                  {canEdit && (
                    <>
                      <button onClick={() => openEditForm(v)} className="btn btn-ghost">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(v)} className="btn btn-danger-ghost">
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
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(20, 24, 31, 0.45)" }}
        >
          <form
            onSubmit={handleSubmit}
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              {editingId ? "Editar veiculo" : "Novo veiculo"}
            </h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <FormSection label="Identificacao">
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
                    onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })}
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
              </div>
            </FormSection>

            <FormSection label="Localizacao e responsavel">
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </FormSection>

            <FormSection label="Documentacao">
              <div className="grid grid-cols-2 gap-3">
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
                <Field label="Proprietario">
                  <input
                    className="input"
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
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
              </div>
            </FormSection>

            <Field label="Observacoes">
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary mt-4"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary mt-4">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="section-label">{label}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field-label">
      {label}
      {children}
    </label>
  );
}
