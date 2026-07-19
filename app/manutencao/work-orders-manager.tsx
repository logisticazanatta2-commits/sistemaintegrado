"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import {
  WORK_ORDER_STATUS_TONE,
  type MaintenanceType,
  type WorkOrder,
  type WorkOrderItem,
  type WorkOrderStatus,
} from "@/lib/work-orders";
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

const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  periodica: "Periodica",
  pneus: "Pneus",
  recall: "Recall",
  acessorios: "Acessorios",
  outro: "Outro",
};

const MAINTENANCE_TYPE_ORDER = Object.keys(MAINTENANCE_TYPE_LABEL) as MaintenanceType[];

function formatCents(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10).split("-").reverse().join("/");
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
  maintenance_type: "" as MaintenanceType | "",
  os_number: "",
  invoice_number: "",
  payment_term: "",
  project_client: "",
  odometer_at_service: "",
};

type FormState = typeof EMPTY_FORM;

export default function WorkOrdersManager({ canEdit }: { canEdit: boolean }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | WorkOrderStatus>("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] = useState<"" | MaintenanceType>("");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<number, WorkOrderItem[]>>({});
  const [expandLoading, setExpandLoading] = useState<number | null>(null);

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
      if (maintenanceTypeFilter) params.set("maintenance_type", maintenanceTypeFilter);
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
  }, [statusFilter, vehicleFilter, maintenanceTypeFilter]);

  const counts = useMemo(() => {
    return workOrders.reduce<Record<string, number>>((acc, wo) => {
      acc[wo.status] = (acc[wo.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [workOrders]);

  async function toggleExpand(wo: WorkOrder) {
    if (expandedId === wo.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(wo.id);
    if (!expandedItems[wo.id]) {
      setExpandLoading(wo.id);
      const res = await fetch(`/api/work-orders/${wo.id}/items`);
      if (res.ok) {
        const data = (await res.json()) as { items: WorkOrderItem[] };
        setExpandedItems((prev) => ({ ...prev, [wo.id]: data.items }));
      }
      setExpandLoading(null);
    }
  }

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
      maintenance_type: wo.maintenance_type ?? "",
      os_number: wo.os_number ?? "",
      invoice_number: wo.invoice_number ?? "",
      payment_term: wo.payment_term ?? "",
      project_client: wo.project_client ?? "",
      odometer_at_service: wo.odometer_at_service !== null ? String(wo.odometer_at_service) : "",
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
        maintenance_type: form.maintenance_type,
        os_number: form.os_number,
        invoice_number: form.invoice_number,
        payment_term: form.payment_term,
        project_client: form.project_client,
        odometer_at_service: form.odometer_at_service,
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
      if (editingId) {
        setExpandedItems((prev) => {
          const next = { ...prev };
          delete next[editingId];
          return next;
        });
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
            className="input"
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
            className="input"
          >
            <option value="">Todos os veiculos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate ?? v.asset_code} - {v.model}
              </option>
            ))}
          </select>
          <select
            value={maintenanceTypeFilter}
            onChange={(e) => setMaintenanceTypeFilter(e.target.value as MaintenanceType | "")}
            className="input"
          >
            <option value="">Todos os tipos</option>
            {MAINTENANCE_TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {MAINTENANCE_TYPE_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button onClick={openCreateForm} className="btn btn-primary">
            + Nova OS
          </button>
        )}
      </div>

      <div className="text-xs" style={{ color: "var(--text-faint)" }}>
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

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="data-table" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: "6rem" }} />
            <col style={{ width: "8rem" }} />
            <col />
            <col style={{ width: "6rem" }} />
            <col style={{ width: "7rem" }} />
            <col style={{ width: "7.5rem" }} />
            <col style={{ width: "15rem" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Data</th>
              <th>Veiculo</th>
              <th>Problema</th>
              <th>Tipo</th>
              <th>Custo</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center" style={{ color: "var(--text-faint)" }}>
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && workOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center" style={{ color: "var(--text-faint)" }}>
                  Nenhuma OS cadastrada.
                </td>
              </tr>
            )}
            {workOrders.map((wo) => {
              const isOpen = expandedId === wo.id;
              const rowItems = expandedItems[wo.id];
              const total = wo.final_cost_cents ?? wo.items_total_cents ?? 0;
              return (
                <Fragment key={wo.id}>
                  <tr>
                    <td className="mono whitespace-nowrap">{formatDate(wo.opened_at)}</td>
                    <td>
                      <div className="mono font-medium">{wo.vehicle_plate ?? "-"}</div>
                      <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                        {wo.vehicle_model}
                      </div>
                    </td>
                    <td className="max-w-xs truncate" title={wo.problem_description}>
                      {wo.problem_description}
                    </td>
                    <td>
                      {wo.maintenance_type ? (
                        <Badge tone="accent">{MAINTENANCE_TYPE_LABEL[wo.maintenance_type]}</Badge>
                      ) : (
                        <span style={{ color: "var(--text-faint)" }}>-</span>
                      )}
                    </td>
                    <td className="num font-medium">{formatCents(total)}</td>
                    <td>
                      <Badge tone={WORK_ORDER_STATUS_TONE[wo.status]}>{STATUS_LABEL[wo.status]}</Badge>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button onClick={() => toggleExpand(wo)} className="btn btn-secondary">
                        {isOpen ? "Ocultar" : "Ver itens"}
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => openEditForm(wo)} className="btn btn-ghost">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(wo)} className="btn btn-danger-ghost">
                            Excluir
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="expand-row">
                      <td colSpan={7}>
                        <WorkOrderDetail
                          wo={wo}
                          items={rowItems}
                          loading={expandLoading === wo.id}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
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
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              {editingId ? `Editar OS #${editingId}` : "Nova OS"}
            </h2>

            {formError && <div className="alert alert-error">{formError}</div>}

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
              <Field label="Tipo de manutencao">
                <select
                  className="input"
                  value={form.maintenance_type}
                  onChange={(e) =>
                    setForm({ ...form, maintenance_type: e.target.value as MaintenanceType | "" })
                  }
                >
                  <option value="">Nao informado</option>
                  {MAINTENANCE_TYPE_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {MAINTENANCE_TYPE_LABEL[value]}
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
              <Field label="Prazo de pagamento">
                <input
                  className="input"
                  value={form.payment_term}
                  onChange={(e) => setForm({ ...form, payment_term: e.target.value })}
                  placeholder="Ex: A VISTA, 28DD"
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
              <Field label="Hodometro no atendimento (km)">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.odometer_at_service}
                  onChange={(e) => setForm({ ...form, odometer_at_service: e.target.value })}
                />
              </Field>
              <Field label="Nº OS (externo)">
                <input
                  className="input"
                  value={form.os_number}
                  onChange={(e) => setForm({ ...form, os_number: e.target.value })}
                />
              </Field>
              <Field label="Nº Nota Fiscal">
                <input
                  className="input"
                  value={form.invoice_number}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                />
              </Field>
              <Field label="Obra/Projeto/Cliente">
                <input
                  className="input"
                  value={form.project_client}
                  onChange={(e) => setForm({ ...form, project_client: e.target.value })}
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
              <div className="flex flex-col gap-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="section-label">Itens (pecas/servicos)</div>
                {items.length > 0 && (
                  <table className="text-sm w-full">
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td className="py-1.5">{item.description}</td>
                          <td className="py-1.5 text-right mono">{item.quantity}x</td>
                          <td className="py-1.5 text-right mono">{formatCents(item.unit_cost_cents)}</td>
                          <td className="py-1.5 text-right mono font-medium">
                            {formatCents(item.quantity * item.unit_cost_cents)}
                          </td>
                          <td className="py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item)}
                              className="btn btn-danger-ghost"
                              style={{ padding: "0.15rem 0.4rem", fontSize: "0.72rem" }}
                            >
                              remover
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} className="py-1.5 text-right font-semibold">
                          Total dos itens
                        </td>
                        <td className="py-1.5 text-right font-semibold mono">
                          {formatCents(itemsTotalCents)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                )}
                <div className="flex gap-2 items-end">
                  <label className="field-label flex-1">
                    Descricao
                    <input
                      className="input"
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    />
                  </label>
                  <label className="field-label w-20">
                    Qtd
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    />
                  </label>
                  <label className="field-label w-28">
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
                    className="btn btn-secondary"
                  >
                    + item
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary mt-4"
              >
                Fechar
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

function WorkOrderDetail({
  wo,
  items,
  loading,
}: {
  wo: WorkOrder;
  items: WorkOrderItem[] | undefined;
  loading: boolean;
}) {
  const total = items?.reduce((sum, i) => sum + i.quantity * i.unit_cost_cents, 0) ?? 0;

  const meta: [string, string][] = (
    [
      ["Oficina", wo.workshop],
      ["Metodo de pagamento", wo.payment_method],
      ["Prazo de pagamento", wo.payment_term],
      ["Solicitante", wo.requested_by],
      ["Aprovador", wo.approved_by],
      ["Nº OS", wo.os_number],
      ["Nº Nota Fiscal", wo.invoice_number],
      ["Obra/Projeto/Cliente", wo.project_client],
      ["Hodometro no atendimento", wo.odometer_at_service ? `${wo.odometer_at_service.toLocaleString("pt-BR")} km` : null],
    ] as [string, string | null][]
  ).filter((pair): pair is [string, string] => pair[1] !== null);

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="section-label mb-1">Detalhamento da manutencao</div>
          <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {wo.vehicle_plate ?? wo.vehicle_model} · {formatDate(wo.opened_at)}
          </div>
        </div>
        {wo.final_cost_cents !== null && (
          <div className="text-right">
            <div className="section-label mb-1">Total</div>
            <div className="text-base font-semibold mono" style={{ color: "var(--ink)" }}>
              {formatCents(wo.final_cost_cents)}
            </div>
          </div>
        )}
      </div>

      {meta.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
          {meta.map(([label, value]) => (
            <div key={label}>
              <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                {label}
              </div>
              <div className="text-sm" style={{ color: "var(--text)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="section-label mb-2">Itens</div>
        {loading && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            Carregando itens...
          </div>
        )}
        {!loading && items && items.length === 0 && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            Nenhum item registrado para esta OS.
          </div>
        )}
        {!loading && items && items.length > 0 && (
          <div className="card overflow-x-auto" style={{ background: "var(--surface)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descricao</th>
                  <th className="whitespace-nowrap">Qtd.</th>
                  <th className="whitespace-nowrap">Vlr. unitario</th>
                  <th className="whitespace-nowrap">Vlr. total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-xs truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="num whitespace-nowrap">{item.quantity}</td>
                    <td className="num whitespace-nowrap">{formatCents(item.unit_cost_cents)}</td>
                    <td className="num whitespace-nowrap font-medium">
                      {formatCents(item.quantity * item.unit_cost_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {total > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right font-semibold">
                      Total dos itens
                    </td>
                    <td className="num font-semibold">{formatCents(total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {wo.notes && (
        <div>
          <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>
            Observacoes
          </div>
          <div className="text-sm" style={{ color: "var(--text)" }}>
            {wo.notes}
          </div>
        </div>
      )}
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
