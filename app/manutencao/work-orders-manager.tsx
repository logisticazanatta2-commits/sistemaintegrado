"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkOrder, WorkOrderItem, WorkOrderStatus } from "@/lib/work-orders";
import type { Vehicle } from "@/lib/vehicles";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  solicitada: "Solicitada",
  em_analise: "Em analise",
  aguardando_orcamento: "Aguardando orcamento",
  aguardando_aprovacao: "Aguardando aprovacao",
  aprovada: "Aprovada",
  em_execucao: "Em execucao",
  concluida: "Concluida",
  faturada: "Faturada",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

const STATUS_ORDER = Object.keys(STATUS_LABEL) as WorkOrderStatus[];

function formatCents(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY_FORM = {
  vehicle_id: "",
  status: "solicitada" as WorkOrderStatus,
  problem_description: "",
  workshop: "",
  requested_by: "",
  approved_by: "",
  payment_method: "",
  final_cost: "",
  opened_at: "",
  closed_at: "",
  notes: "",
};

type FormState = typeof EMPTY_FORM;

export default function WorkOrdersManager({ canEdit }: { canEdit: boolean }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | WorkOrderStatus>("");
  const [vehicleFilter, setVehicleFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [itemForm, setItemForm] = useState({ description: "", quantity: "1", unit_cost: "" });

  async function loadVehicles() {
    const res = await fetch("/api/vehicles");
    if (res.ok) {
      const data = (await res.json()) as { vehicles: Vehicle[] };
      setVehicles(data.vehicles);
    }
  }

  async function loadWorkOrders() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (vehicleFilter) params.set("vehicle_id", vehicleFilter);
      const res = await fetch(`/api/work-orders?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao carregar ordens de servico.");
      const data = (await res.json()) as { workOrders: WorkOrder[] };
      setWorkOrders(data.workOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadVehicles, 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadWorkOrders, 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, vehicleFilter]);

  const counts = useMemo(() => {
    return workOrders.reduce<Record<string, number>>((acc, wo) => {
      acc[wo.status] = (acc[wo.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [workOrders]);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setItems([]);
    setFormError(null);
    setShowForm(true);
  }

  async function openEditForm(wo: WorkOrder) {
    setEditingId(wo.id);
    setForm({
      vehicle_id: String(wo.vehicle_id),
      status: wo.status,
      problem_description: wo.problem_description,
      workshop: wo.workshop ?? "",
      requested_by: wo.requested_by ?? "",
      approved_by: wo.approved_by ?? "",
      payment_method: wo.payment_method ?? "",
      final_cost: wo.final_cost_cents !== null ? (wo.final_cost_cents / 100).toString() : "",
      opened_at: wo.opened_at ? wo.opened_at.slice(0, 10) : "",
      closed_at: wo.closed_at ? wo.closed_at.slice(0, 10) : "",
      notes: wo.notes ?? "",
    });
    setFormError(null);
    setShowForm(true);
    const res = await fetch(`/api/work-orders/${wo.id}/items`);
    if (res.ok) {
      const data = (await res.json()) as { items: WorkOrderItem[] };
      setItems(data.items);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        vehicle_id: form.vehicle_id,
        status: form.status,
        problem_description: form.problem_description,
        workshop: form.workshop,
        requested_by: form.requested_by,
        approved_by: form.approved_by,
        payment_method: form.payment_method,
        final_cost_cents: form.final_cost ? Math.round(Number(form.final_cost) * 100) : "",
        opened_at: form.opened_at,
        closed_at: form.closed_at,
        notes: form.notes,
      };
      const url = editingId ? `/api/work-orders/${editingId}` : "/api/work-orders";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao salvar OS.");
      }
      if (!editingId && data.workOrder) {
        await openEditForm(data.workOrder as WorkOrder);
      } else {
        setShowForm(false);
      }
      await loadWorkOrders();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(wo: WorkOrder) {
    if (!confirm(`Excluir a OS #${wo.id} (${wo.vehicle_plate ?? wo.vehicle_model})?`)) return;
    const res = await fetch(`/api/work-orders/${wo.id}`, { method: "DELETE" });
    if (res.ok) {
      await loadWorkOrders();
    } else {
      alert("Nao foi possivel excluir a OS.");
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const res = await fetch(`/api/work-orders/${editingId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: itemForm.description,
        quantity: itemForm.quantity,
        unit_cost_cents: itemForm.unit_cost ? Math.round(Number(itemForm.unit_cost) * 100) : 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Erro ao adicionar item.");
      return;
    }
    setItems([...items, data.item]);
    setItemForm({ description: "", quantity: "1", unit_cost: "" });
    await loadWorkOrders();
  }

  async function handleRemoveItem(item: WorkOrderItem) {
    if (!editingId) return;
    const res = await fetch(`/api/work-orders/${editingId}/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems(items.filter((i) => i.id !== item.id));
      await loadWorkOrders();
    }
  }

  const itemsTotalCents = items.reduce((sum, i) => sum + i.quantity * i.unit_cost_cents, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | "")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Todos os status</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Todos os veiculos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate ?? v.asset_code} - {v.model}
              </option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button
            onClick={openCreateForm}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            + Nova OS
          </button>
        )}
      </div>

      <div className="text-xs text-slate-500">
        {workOrders.length} OS
        {Object.entries(counts).length > 0 && (
          <>
            {" "}
            (
            {Object.entries(counts)
              .map(([st, n]) => `${STATUS_LABEL[st as WorkOrderStatus]}: ${n}`)
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
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Veiculo</th>
              <th className="px-3 py-2">Problema</th>
              <th className="px-3 py-2">Oficina</th>
              <th className="px-3 py-2">Custo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && workOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  Nenhuma OS cadastrada.
                </td>
              </tr>
            )}
            {workOrders.map((wo) => (
              <tr key={wo.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono">{wo.id}</td>
                <td className="px-3 py-2 font-mono">{wo.vehicle_plate ?? wo.vehicle_model}</td>
                <td className="px-3 py-2 max-w-xs truncate" title={wo.problem_description}>
                  {wo.problem_description}
                </td>
                <td className="px-3 py-2">{wo.workshop ?? "-"}</td>
                <td className="px-3 py-2">
                  {formatCents(wo.final_cost_cents ?? wo.items_total_cents ?? 0)}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {STATUS_LABEL[wo.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => openEditForm(wo)}
                        className="text-slate-600 hover:text-slate-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(wo)}
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
              {editingId ? `Editar OS #${editingId}` : "Nova OS"}
            </h2>

            {formError && (
              <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Veiculo *">
                <select
                  className="input"
                  required
                  value={form.vehicle_id}
                  onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate ?? v.asset_code} - {v.model}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrderStatus })}
                >
                  {STATUS_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABEL[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Oficina">
                <input
                  className="input"
                  value={form.workshop}
                  onChange={(e) => setForm({ ...form, workshop: e.target.value })}
                />
              </Field>
              <Field label="Metodo de pagamento">
                <input
                  className="input"
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                />
              </Field>
              <Field label="Solicitante">
                <input
                  className="input"
                  value={form.requested_by}
                  onChange={(e) => setForm({ ...form, requested_by: e.target.value })}
                />
              </Field>
              <Field label="Aprovador">
                <input
                  className="input"
                  value={form.approved_by}
                  onChange={(e) => setForm({ ...form, approved_by: e.target.value })}
                />
              </Field>
              <Field label="Aberta em">
                <input
                  type="date"
                  className="input"
                  value={form.opened_at}
                  onChange={(e) => setForm({ ...form, opened_at: e.target.value })}
                />
              </Field>
              <Field label="Encerrada em">
                <input
                  type="date"
                  className="input"
                  value={form.closed_at}
                  onChange={(e) => setForm({ ...form, closed_at: e.target.value })}
                />
              </Field>
              <Field label="Custo final (R$, opcional)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={form.final_cost}
                  onChange={(e) => setForm({ ...form, final_cost: e.target.value })}
                  placeholder={itemsTotalCents ? (itemsTotalCents / 100).toFixed(2) : "0.00"}
                />
              </Field>
            </div>

            <Field label="Descricao do problema *">
              <textarea
                className="input"
                required
                rows={2}
                value={form.problem_description}
                onChange={(e) => setForm({ ...form, problem_description: e.target.value })}
              />
            </Field>
            <Field label="Observacoes">
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            {editingId && (
              <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Itens (pecas/servicos)</h3>
                {items.length > 0 && (
                  <table className="text-sm w-full">
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-1">{item.description}</td>
                          <td className="py-1 text-right">{item.quantity}x</td>
                          <td className="py-1 text-right">{formatCents(item.unit_cost_cents)}</td>
                          <td className="py-1 text-right font-medium">
                            {formatCents(item.quantity * item.unit_cost_cents)}
                          </td>
                          <td className="py-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              remover
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} className="py-1 text-right font-semibold">
                          Total dos itens
                        </td>
                        <td className="py-1 text-right font-semibold">
                          {formatCents(itemsTotalCents)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                )}
                <div className="flex gap-2 items-end">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 flex-1">
                    Descricao
                    <input
                      className="input"
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 w-20">
                    Qtd
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 w-28">
                    Valor unit. (R$)
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input"
                      value={itemForm.unit_cost}
                      onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!itemForm.description}
                    className="rounded-md bg-slate-200 px-3 py-1.5 text-sm hover:bg-slate-300 disabled:opacity-50"
                  >
                    + item
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-4 py-1.5 text-sm border border-slate-300"
              >
                Fechar
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
