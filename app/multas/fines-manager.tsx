"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/stat-card";
import type { SessionUser } from "@/lib/auth";
import {
  canEditFinanceiro,
  canEditOfficialData,
  canEditRh,
  canEditSetor,
  computeNextAction,
  effectiveFinesRole,
  FINES_ROLE_LABEL,
  FINE_STATUSES,
  FINE_STATUS_LABEL,
  FINE_STATUS_TONE,
  FLEET_COMPANIES,
  FLOW_STAGE_STATUSES,
  FLOW_STAGE_STATUS_LABEL,
  type Fine,
  type FineStatus,
  type FlowStageStatus,
  type Urgency,
} from "@/lib/fines";
import type { Vehicle } from "@/lib/vehicles";

interface Department {
  id: number;
  name: string;
}

interface HistoryRow {
  id: number;
  user_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

function urgencyColor(u: Urgency): string {
  if (u === "crit") return "var(--crit)";
  if (u === "warn") return "var(--warn)";
  return "var(--text-faint)";
}

function formatCents(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function centsToReais(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);
}
function formatDate(value: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10).split("-").reverse().join("/");
}

const EMPTY_FORM = {
  vehicle_id: "",
  plate_raw: "",
  year: "",
  department: "",
  department_id: "",
  fleet_company: "",
  notes: "",
  fine_type: "primeira" as "primeira" | "segunda",
  parent_fine_id: "",
  auto_number: "",
  renainf_number: "",
  renainf_original: "",
  points: "",
  infraction_date: "",
  infraction_location: "",
  infraction_code: "",
  infraction_description: "",
  issuing_body_code: "",
  issuing_body: "",
  driver_name: "",
  indication_deadline: "",
  form_sent_date: "",
  form_received_by: "",
  protocol_date: "",
  identification_method: "",
  invoice_status: "",
  cigam_launch_number: "",
  amount: "",
  discount: "",
  amount_paid: "",
  due_date: "",
  discount_launched: "",
  discount_launch_date: "",
  discount_method: "",
  discount_completed: "",
  discount_completion_date: "",
  status: "pendente" as FineStatus,
  file_key: "",
  file_name: "",
};

type FormState = typeof EMPTY_FORM;

function fineToForm(f: Fine): FormState {
  return {
    vehicle_id: f.vehicle_id ? String(f.vehicle_id) : "",
    plate_raw: f.plate_raw ?? "",
    year: f.year?.toString() ?? "",
    department: f.department ?? "",
    department_id: f.department_id ? String(f.department_id) : "",
    fleet_company: f.fleet_company ?? "",
    notes: f.notes ?? "",
    fine_type: f.fine_type,
    parent_fine_id: f.parent_fine_id ? String(f.parent_fine_id) : "",
    auto_number: f.auto_number ?? "",
    renainf_number: f.renainf_number ?? "",
    renainf_original: f.renainf_original ?? "",
    points: f.points?.toString() ?? "",
    infraction_date: f.infraction_date ?? "",
    infraction_location: f.infraction_location ?? "",
    infraction_code: f.infraction_code ?? "",
    infraction_description: f.infraction_description ?? "",
    issuing_body_code: f.issuing_body_code ?? "",
    issuing_body: f.issuing_body ?? "",
    driver_name: f.driver_name ?? "",
    indication_deadline: f.indication_deadline ?? "",
    form_sent_date: f.form_sent_date ?? "",
    form_received_by: f.form_received_by ?? "",
    protocol_date: f.protocol_date ?? "",
    identification_method: f.identification_method ?? "",
    invoice_status: f.invoice_status ?? "",
    cigam_launch_number: f.cigam_launch_number ?? "",
    amount: centsToReais(f.amount_cents),
    discount: centsToReais(f.discount_cents),
    amount_paid: centsToReais(f.amount_paid_cents),
    due_date: f.due_date ?? "",
    discount_launched: f.discount_launched ?? "",
    discount_launch_date: f.discount_launch_date ?? "",
    discount_method: f.discount_method ?? "",
    discount_completed: f.discount_completed ?? "",
    discount_completion_date: f.discount_completion_date ?? "",
    status: f.status,
    file_key: f.file_key ?? "",
    file_name: f.file_name ?? "",
  };
}

const EMPTY_FLOW_FORM = {
  department: "",
  flow_responsible_name: "",
  flow_responsible_email: "",
  flow_responsible_status: "nao_iniciado" as FlowStageStatus,
  flow_department_status: "nao_iniciado" as FlowStageStatus,
  flow_rh_status: "nao_iniciado" as FlowStageStatus,
  discount_method: "",
  discount_installments: "",
  discount_completion_date: "",
  flow_financial_status: "nao_iniciado" as FlowStageStatus,
  cigam_launch_number: "",
  notes: "",
};

type FlowFormState = typeof EMPTY_FLOW_FORM;

function fineToFlowForm(f: Fine): FlowFormState {
  return {
    department: f.department ?? "",
    flow_responsible_name: f.flow_responsible_name ?? "",
    flow_responsible_email: f.flow_responsible_email ?? "",
    flow_responsible_status: f.flow_responsible_status ?? "nao_iniciado",
    flow_department_status: f.flow_department_status ?? "nao_iniciado",
    flow_rh_status: f.flow_rh_status ?? "nao_iniciado",
    discount_method: f.discount_method ?? "",
    discount_installments: f.discount_installments?.toString() ?? "",
    discount_completion_date: f.discount_completion_date ?? "",
    flow_financial_status: f.flow_financial_status ?? "nao_iniciado",
    cigam_launch_number: f.cigam_launch_number ?? "",
    notes: f.notes ?? "",
  };
}

const EMPTY_SETOR_FORM = {
  driver_name: "",
  identification_method: "",
  form_sent_date: "",
  form_received_by: "",
  protocol_date: "",
};
type SetorFormState = typeof EMPTY_SETOR_FORM;
function fineToSetorForm(f: Fine): SetorFormState {
  return {
    driver_name: f.driver_name ?? "",
    identification_method: f.identification_method ?? "",
    form_sent_date: f.form_sent_date ?? "",
    form_received_by: f.form_received_by ?? "",
    protocol_date: f.protocol_date ?? "",
  };
}

const EMPTY_FINANCEIRO_FORM = {
  invoice_status: "",
  amount_paid: "",
  due_date: "",
  cigam_launch_number: "",
  flow_financial_status: "nao_iniciado" as FlowStageStatus,
};
type FinanceiroFormState = typeof EMPTY_FINANCEIRO_FORM;
function fineToFinanceiroForm(f: Fine): FinanceiroFormState {
  return {
    invoice_status: f.invoice_status ?? "",
    amount_paid: centsToReais(f.amount_paid_cents),
    due_date: f.due_date ?? "",
    cigam_launch_number: f.cigam_launch_number ?? "",
    flow_financial_status: f.flow_financial_status ?? "nao_iniciado",
  };
}

const EMPTY_RH_FORM = {
  discount_launched: "",
  discount_launch_date: "",
  discount_method: "",
  discount_installments: "",
  discount_completed: "",
  discount_completion_date: "",
  flow_rh_status: "nao_iniciado" as FlowStageStatus,
};
type RhFormState = typeof EMPTY_RH_FORM;
function fineToRhForm(f: Fine): RhFormState {
  return {
    discount_launched: f.discount_launched ?? "",
    discount_launch_date: f.discount_launch_date ?? "",
    discount_method: f.discount_method ?? "",
    discount_installments: f.discount_installments?.toString() ?? "",
    discount_completed: f.discount_completed ?? "",
    discount_completion_date: f.discount_completion_date ?? "",
    flow_rh_status: f.flow_rh_status ?? "nao_iniciado",
  };
}

export default function FinesManager({ user }: { user: SessionUser }) {
  const finesRole = effectiveFinesRole(user);
  const canEdit = canEditOfficialData(user); // Admin de Multas: cadastro/edicao/exclusao/status
  const canFinanceiro = canEditFinanceiro(user);
  const canRh = canEditRh(user);

  const [fines, setFines] = useState<Fine[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | FineStatus>("");
  const [yearFilter, setYearFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [plateSearch, setPlateSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [flowFine, setFlowFine] = useState<Fine | null>(null);
  const [flowForm, setFlowForm] = useState<FlowFormState>(EMPTY_FLOW_FORM);
  const [flowSaving, setFlowSaving] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null);

  const [setorFine, setSetorFine] = useState<Fine | null>(null);
  const [setorForm, setSetorForm] = useState<SetorFormState>(EMPTY_SETOR_FORM);
  const [setorSaving, setSetorSaving] = useState(false);
  const [setorError, setSetorError] = useState<string | null>(null);

  const [financeiroFine, setFinanceiroFine] = useState<Fine | null>(null);
  const [financeiroForm, setFinanceiroForm] = useState<FinanceiroFormState>(EMPTY_FINANCEIRO_FORM);
  const [financeiroSaving, setFinanceiroSaving] = useState(false);
  const [financeiroError, setFinanceiroError] = useState<string | null>(null);

  const [rhFine, setRhFine] = useState<Fine | null>(null);
  const [rhForm, setRhForm] = useState<RhFormState>(EMPTY_RH_FORM);
  const [rhSaving, setRhSaving] = useState(false);
  const [rhError, setRhError] = useState<string | null>(null);

  async function loadFines() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fines");
      if (!res.ok) throw new Error("Falha ao carregar multas.");
      const data = await res.json();
      setFines(data.fines ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadFines();
      fetch("/api/vehicles")
        .then((r) => r.json())
        .then((d) => setVehicles(d.vehicles ?? []));
      fetch("/api/departments")
        .then((r) => r.json())
        .then((d) => setDepartments(d.departments ?? []));
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const counts = useMemo(() => {
    return fines.reduce<Record<string, number>>((acc, f) => {
      acc[f.status] = (acc[f.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [fines]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const f of fines) {
      if (f.infraction_date) years.add(f.infraction_date.slice(0, 4));
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [fines]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fines
      .filter((f) => {
        if (statusFilter && f.status !== statusFilter) return false;
        if (yearFilter && f.infraction_date?.slice(0, 4) !== yearFilter) return false;
        if (!q) return true;
        return (
          f.vehicle_plate?.toLowerCase().includes(q) ||
          f.plate_raw?.toLowerCase().includes(q) ||
          f.infraction_description?.toLowerCase().includes(q) ||
          f.auto_number?.toLowerCase().includes(q) ||
          f.driver_name?.toLowerCase().includes(q) ||
          f.department?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.infraction_date ?? "").localeCompare(a.infraction_date ?? ""));
  }, [fines, statusFilter, yearFilter, search]);

  const summary = useMemo(() => {
    const total = fines.length;
    const abertas = fines.filter((f) => f.status !== "concluido" && f.status !== "cancelado").length;
    const valorTotal = fines.reduce((s, f) => s + (f.amount_cents ?? 0), 0);
    const valorPago = fines.reduce((s, f) => s + (f.amount_paid_cents ?? 0), 0);
    const valorPendente = fines
      .filter((f) => f.status !== "pagto_realizado" && f.status !== "concluido" && f.status !== "cancelado")
      .reduce((s, f) => s + (f.amount_cents ?? 0), 0);
    const condutorPendente = fines.filter((f) => f.status === "condutor_pendente").length;
    const vencidas = fines.filter((f) => f.status === "pagto_data_vencida").length;
    return { total, abertas, valorTotal, valorPago, valorPendente, condutorPendente, vencidas };
  }, [fines]);

  const matchingVehicles = useMemo(() => {
    const q = plateSearch.trim().toLowerCase();
    if (!q) return [];
    return vehicles
      .filter((v) => v.plate?.toLowerCase().includes(q) || v.model.toLowerCase().includes(q))
      .slice(0, 8);
  }, [vehicles, plateSearch]);

  const matchingParents = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    if (!q) return [];
    return fines
      .filter(
        (f) =>
          f.id !== editingId &&
          (f.auto_number?.toLowerCase().includes(q) || f.renainf_number?.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [fines, parentSearch, editingId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.id) === form.vehicle_id),
    [vehicles, form.vehicle_id]
  );
  const selectedParent = useMemo(
    () => fines.find((f) => String(f.id) === form.parent_fine_id),
    [fines, form.parent_fine_id]
  );

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDuplicateInfo(null);
    setPlateSearch("");
    setParentSearch("");
    setShowForm(true);
  }

  function openEditForm(f: Fine) {
    setEditingId(f.id);
    setForm(fineToForm(f));
    setFormError(null);
    setDuplicateInfo(null);
    setPlateSearch("");
    setParentSearch("");
    setShowForm(true);
  }

  function openFlow(f: Fine) {
    setFlowFine(f);
    setFlowForm(fineToFlowForm(f));
    setFlowError(null);
  }

  async function submitFlow(e: React.FormEvent) {
    e.preventDefault();
    if (!flowFine) return;
    setFlowSaving(true);
    setFlowError(null);
    try {
      const res = await fetch(`/api/fines/${flowFine.id}/fluxo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flowForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar fluxo.");
      setFlowFine(null);
      await loadFines();
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setFlowSaving(false);
    }
  }

  function openSetor(f: Fine) {
    setSetorFine(f);
    setSetorForm(fineToSetorForm(f));
    setSetorError(null);
  }
  async function submitSetor(e: React.FormEvent) {
    e.preventDefault();
    if (!setorFine) return;
    setSetorSaving(true);
    setSetorError(null);
    try {
      const res = await fetch(`/api/fines/${setorFine.id}/setor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setorForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar indicacao de condutor.");
      setSetorFine(null);
      await loadFines();
    } catch (err) {
      setSetorError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSetorSaving(false);
    }
  }

  function openFinanceiro(f: Fine) {
    setFinanceiroFine(f);
    setFinanceiroForm(fineToFinanceiroForm(f));
    setFinanceiroError(null);
  }
  async function submitFinanceiro(e: React.FormEvent) {
    e.preventDefault();
    if (!financeiroFine) return;
    setFinanceiroSaving(true);
    setFinanceiroError(null);
    try {
      const res = await fetch(`/api/fines/${financeiroFine.id}/financeiro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(financeiroForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar financeiro.");
      setFinanceiroFine(null);
      await loadFines();
    } catch (err) {
      setFinanceiroError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setFinanceiroSaving(false);
    }
  }

  function openRh(f: Fine) {
    setRhFine(f);
    setRhForm(fineToRhForm(f));
    setRhError(null);
  }
  async function submitRh(e: React.FormEvent) {
    e.preventDefault();
    if (!rhFine) return;
    setRhSaving(true);
    setRhError(null);
    try {
      const res = await fetch(`/api/fines/${rhFine.id}/rh`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rhForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar desconto/RH.");
      setRhFine(null);
      await loadFines();
    } catch (err) {
      setRhError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setRhSaving(false);
    }
  }

  /** Abre a etapa certa conforme o perfil de multas de quem esta logado. */
  function openScoped(f: Fine) {
    if (finesRole === "admin_multas") return openFlow(f);
    if (finesRole === "gestor_setor" && canEditSetor(user, f)) return openSetor(f);
    if (finesRole === "financeiro") return openFinanceiro(f);
    if (finesRole === "rh") return openRh(f);
    return openFlow(f); // leitura
  }

  async function quickStatusChange(f: Fine, status: FineStatus) {
    setStatusSavingId(f.id);
    try {
      const res = await fetch(`/api/fines/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fineToForm(f), status }),
      });
      if (!res.ok) throw new Error();
      await loadFines();
    } catch {
      alert("Nao foi possivel atualizar o status.");
    } finally {
      setStatusSavingId(null);
    }
  }

  async function submitForm(e: React.FormEvent, confirmDuplicate = false) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const url = editingId ? `/api/fines/${editingId}` : "/api/fines";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, confirm_duplicate: confirmDuplicate }),
      });
      const data = await res.json();
      if (res.status === 409 && data.duplicate) {
        setDuplicateInfo(data.duplicate);
        setFormError(data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar multa.");
      setShowForm(false);
      await loadFines();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: Fine) {
    if (!confirm(`Excluir a multa ${f.auto_number ?? f.id} (${f.vehicle_plate ?? f.plate_raw ?? "-"})?`)) return;
    const res = await fetch(`/api/fines/${f.id}`, { method: "DELETE" });
    if (res.ok) {
      await loadFines();
    } else {
      alert("Nao foi possivel excluir a multa.");
    }
  }

  async function handleImportPdf(file: File) {
    setImporting(true);
    setImportError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/fines/importar-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar o documento.");

      const extracted = data.extracted;
      setEditingId(null);
      setForm({
        ...EMPTY_FORM,
        vehicle_id: data.vehicle?.id ? String(data.vehicle.id) : "",
        plate_raw: extracted.plate ?? "",
        auto_number: extracted.auto_number ?? "",
        renainf_number: extracted.renainf_number ?? "",
        infraction_date: extracted.infraction_date ?? "",
        infraction_location: extracted.infraction_location ?? "",
        infraction_code: extracted.infraction_code ?? "",
        infraction_description: extracted.infraction_description ?? "",
        issuing_body: extracted.issuing_body ?? "",
        points: extracted.points?.toString() ?? "",
        amount: extracted.amount_cents ? (extracted.amount_cents / 100).toFixed(2) : "",
        due_date: extracted.due_date ?? "",
        indication_deadline: extracted.indication_deadline ?? "",
        status: "pendente",
        file_key: data.file_key,
        file_name: data.file_name,
      });
      setFormError(null);
      setDuplicateInfo(null);
      setPlateSearch("");
      setParentSearch("");
      setShowImport(false);
      setShowForm(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-xs" style={{ color: "var(--text-faint)" }}>
        {user.id === 0
          ? "Visualizacao publica - somente leitura."
          : finesRole === "viewer"
            ? `Visualizador - ${user.name} (somente leitura).`
            : `Voce esta como ${FINES_ROLE_LABEL[finesRole]} - ${user.name}` +
              (finesRole === "gestor_setor" ? ", edita apenas a indicacao de condutor do seu setor." : ".")}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total de multas" value={String(summary.total)} />
        <StatCard label="Em aberto" value={String(summary.abertas)} tone={summary.abertas > 0 ? "warn" : "ink"} />
        <StatCard
          label="Condutor pendente"
          value={String(summary.condutorPendente)}
          tone={summary.condutorPendente > 0 ? "warn" : "ink"}
        />
        <StatCard label="Vencidas" value={String(summary.vencidas)} tone={summary.vencidas > 0 ? "crit" : "ink"} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Valor total" value={formatCents(summary.valorTotal)} />
        <StatCard label="Valor pago" value={formatCents(summary.valorPago)} tone="accent" />
        <StatCard label="Valor pendente" value={formatCents(summary.valorPendente)} tone={summary.valorPendente > 0 ? "warn" : "ink"} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`tab-pill${statusFilter === "" ? " tab-pill-active" : ""}`}
        >
          Todas
          <span className="tab-pill-count">{fines.length}</span>
        </button>
        {FINE_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`tab-pill${statusFilter === s ? " tab-pill-active" : ""}`}
          >
            {FINE_STATUS_LABEL[s]}
            <span className="tab-pill-count">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por placa, auto, condutor, setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-80"
          />
          <select
            className="input w-auto"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">Todos os anos</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)} className="btn btn-secondary">
              Importar notificacao em PDF
            </button>
            <button onClick={openCreateForm} className="btn btn-primary">
              + Nova multa
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="text-xs" style={{ color: "var(--text-faint)" }}>
        {filtered.length} multa(s) nesta visualizacao
      </div>

      <div className="card overflow-hidden">
        <div className="fines-row-head">
          <div>Infracao</div>
          <div>Veiculo</div>
          <div>Ocorrencia</div>
          <div>Condutor</div>
          <div>Valores</div>
          <div>Vencim.</div>
          <div>Situacao e fluxo</div>
        </div>
        {loading && (
          <div className="p-6 text-center text-sm" style={{ color: "var(--text-faint)" }}>
            Carregando...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-center text-sm" style={{ color: "var(--text-faint)" }}>
            Nenhuma multa encontrada.
          </div>
        )}
        {filtered.map((f) => {
          const overdue = f.status === "pagto_data_vencida";
          const nextAction = computeNextAction(f);
          return (
            <Fragment key={f.id}>
            <div className="fines-row">
              <div>
                <div className="font-medium truncate" title={f.auto_number ?? undefined}>
                  {f.auto_number ?? "-"}
                </div>
                <div className="muted mono truncate">RENAINF {f.renainf_number ?? "-"}</div>
                <div className="muted truncate">
                  {f.fine_type === "segunda" ? "2a multa - vinculada" : "Autuacao original"}
                </div>
              </div>
              <div>
                <span className="plate-chip">{f.vehicle_plate ?? f.plate_raw ?? "-"}</span>
                <div
                  className={`truncate ${f.vehicle_id ? "fleet-own" : "fleet-rent"}`}
                  title={f.fleet_company ?? undefined}
                >
                  {f.fleet_company ?? (f.vehicle_id ? "Frota propria" : "Terceiro / locadora")}
                </div>
                <div className="muted truncate" title={f.department_name ?? f.department ?? undefined}>
                  {f.department_name ?? f.department ?? "-"}
                </div>
              </div>
              <div>
                <div className="dim truncate">{formatDate(f.infraction_date)}</div>
                <div className="muted truncate">
                  {f.infraction_code ?? "-"}
                  {f.points !== null ? ` - ${f.points} ponto(s)` : ""}
                </div>
                <div className="muted truncate" title={f.infraction_description ?? undefined}>
                  {f.infraction_description ?? "-"}
                </div>
                <div className="muted truncate" title={f.infraction_location ?? undefined}>
                  {f.infraction_location ?? "-"}
                </div>
              </div>
              <div>
                <div className="font-medium truncate" title={f.driver_name ?? undefined}>
                  {f.driver_name ?? "-"}
                </div>
                <div
                  className="muted truncate"
                  title={f.identification_method ?? undefined}
                >
                  {f.identification_method ?? (f.driver_name ? "-" : "Nao identificado")}
                </div>
              </div>
              <div>
                <div className="font-medium">{formatCents(f.amount_cents)}</div>
                <div className="val-paid">Pago: {formatCents(f.amount_paid_cents)}</div>
                {!!f.discount_cents && <div className="val-disc">Desconto: {formatCents(f.discount_cents)}</div>}
              </div>
              <div className="dim" style={overdue ? { color: "var(--crit)" } : undefined}>
                {formatDate(f.due_date)}
              </div>
              <div>
                <select
                  className={`status-select status-select-${FINE_STATUS_TONE[f.status]}`}
                  value={f.status}
                  disabled={!canEdit || statusSavingId === f.id}
                  onChange={(e) => quickStatusChange(f, e.target.value as FineStatus)}
                >
                  {FINE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FINE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                {nextAction.ownerLabel !== "-" && (
                  <div className="text-xs mb-1" style={{ lineHeight: 1.3 }}>
                    <div style={{ color: "var(--text-dim)" }}>{nextAction.what}</div>
                    <div>
                      <span style={{ fontWeight: 600 }}>{nextAction.ownerLabel}</span>
                      {nextAction.deadline && (
                        <span style={{ color: urgencyColor(nextAction.urgency) }}>
                          {" "}
                          · {nextAction.urgency === "crit" ? "venceu " : "ate "}
                          {formatDate(nextAction.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <button type="button" className="flow-btn" onClick={() => openScoped(f)}>
                  <span>
                    {canEdit || canFinanceiro || canRh || canEditSetor(user, f) ? "Abrir etapa" : "Ver fluxo"}
                    <span className="flow-btn-who">
                      {f.flow_responsible_name || FLOW_STAGE_STATUS_LABEL[f.flow_department_status]}
                    </span>
                  </span>
                </button>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                    className="btn btn-ghost text-xs"
                  >
                    {expandedId === f.id ? "Ocultar detalhes" : "Ver detalhes"}
                  </button>
                  {canEdit && (
                    <>
                      <button onClick={() => openEditForm(f)} className="btn btn-ghost text-xs">
                        Editar dados
                      </button>
                      <button onClick={() => handleDelete(f)} className="btn btn-danger-ghost text-xs">
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {expandedId === f.id && (
              <FineDetailPanel fine={f} onEdit={() => openEditForm(f)} onFlow={() => openScoped(f)} canEdit={canEdit} />
            )}
            </Fragment>
          );
        })}
      </div>

      {showImport && (
        <ImportPdfModal
          importing={importing}
          error={importError}
          onClose={() => setShowImport(false)}
          onFile={handleImportPdf}
        />
      )}

      {flowFine && (
        <FlowModal
          fine={flowFine}
          form={flowForm}
          setForm={setFlowForm}
          saving={flowSaving}
          error={flowError}
          canEdit={canEdit}
          departments={departments}
          onClose={() => setFlowFine(null)}
          onSubmit={submitFlow}
        />
      )}

      {setorFine && (
        <SetorModal
          fine={setorFine}
          form={setorForm}
          setForm={setSetorForm}
          saving={setorSaving}
          error={setorError}
          onClose={() => setSetorFine(null)}
          onSubmit={submitSetor}
        />
      )}

      {financeiroFine && (
        <FinanceiroModal
          fine={financeiroFine}
          form={financeiroForm}
          setForm={setFinanceiroForm}
          saving={financeiroSaving}
          error={financeiroError}
          onClose={() => setFinanceiroFine(null)}
          onSubmit={submitFinanceiro}
        />
      )}

      {rhFine && (
        <RhModal
          fine={rhFine}
          form={rhForm}
          setForm={setRhForm}
          saving={rhSaving}
          error={rhError}
          onClose={() => setRhFine(null)}
          onSubmit={submitRh}
        />
      )}

      {showForm && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(20, 24, 31, 0.45)" }}
        >
          <form
            onSubmit={(e) => submitForm(e, false)}
            className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-md)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              {editingId ? `Editar multa #${editingId}` : "Nova multa"}
            </h2>

            {formError && (
              <div className="alert alert-error flex flex-col gap-2">
                <span>{formError}</span>
                {duplicateInfo && (
                  <div className="text-xs flex flex-col gap-1">
                    <span>
                      Registro existente: #{String(duplicateInfo.id)} · auto {String(duplicateInfo.auto_number ?? "-")} ·
                      placa {String(duplicateInfo.plate_normalized ?? "-")} · {formatDate(String(duplicateInfo.infraction_date ?? "") || null)} ·{" "}
                      {formatCents(Number(duplicateInfo.amount_cents ?? 0))}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => submitForm(e as unknown as React.FormEvent, true)}
                      className="btn btn-danger-ghost self-start"
                      style={{ borderColor: "var(--crit)" }}
                    >
                      Salvar mesmo assim (duplicidade confirmada)
                    </button>
                  </div>
                )}
              </div>
            )}

            <FormSection label="Identificacao">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Ano">
                  <input
                    type="number"
                    className="input"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  />
                </Field>
                <Field label="Setor responsavel">
                  <select
                    className="input"
                    value={form.department_id}
                    onChange={(e) => {
                      const dep = departments.find((d) => String(d.id) === e.target.value);
                      setForm({ ...form, department_id: e.target.value, department: dep?.name ?? "" });
                    }}
                  >
                    <option value="">-</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Frota / propriedade">
                  <select
                    className="input"
                    value={form.fleet_company}
                    onChange={(e) => setForm({ ...form, fleet_company: e.target.value })}
                  >
                    <option value="">-</option>
                    {FLEET_COMPANIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status *">
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as FineStatus })}
                  >
                    {FINE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {FINE_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo">
                  <select
                    className="input"
                    value={form.fine_type}
                    onChange={(e) =>
                      setForm({ ...form, fine_type: e.target.value as "primeira" | "segunda" })
                    }
                  >
                    <option value="primeira">1a multa</option>
                    <option value="segunda">2a multa (nao identificacao)</option>
                  </select>
                </Field>
                {form.fine_type === "segunda" && (
                  <Field label="Multa original (buscar por auto/renainf)">
                    {selectedParent ? (
                      <div className="input flex items-center justify-between" style={{ background: "var(--surface-2)" }}>
                        <span className="mono">{selectedParent.auto_number ?? selectedParent.id}</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, parent_fine_id: "" })}
                          className="text-xs"
                          style={{ color: "var(--crit)" }}
                        >
                          remover
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          className="input"
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                          placeholder="Numero do auto ou Renainf..."
                        />
                        {matchingParents.length > 0 && (
                          <div className="flex flex-col gap-1 mt-1">
                            {matchingParents.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setForm({ ...form, parent_fine_id: String(p.id) });
                                  setParentSearch("");
                                }}
                                className="btn btn-secondary justify-start"
                              >
                                <span className="mono">{p.auto_number ?? p.id}</span>&nbsp;— {p.vehicle_plate ?? p.plate_raw}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </Field>
                )}
              </div>
            </FormSection>

            <FormSection label="Veiculo">
              {selectedVehicle ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="mono font-medium">{selectedVehicle.plate}</span>
                    <span style={{ color: "var(--text-dim)" }}> — {selectedVehicle.model}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, vehicle_id: "" })}
                    className="btn btn-ghost"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    className="input"
                    placeholder="Buscar veiculo por placa ou modelo..."
                    value={plateSearch}
                    onChange={(e) => {
                      setPlateSearch(e.target.value);
                      setForm({ ...form, plate_raw: e.target.value });
                    }}
                  />
                  {matchingVehicles.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {matchingVehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, vehicle_id: String(v.id), plate_raw: v.plate ?? "" });
                            setPlateSearch("");
                          }}
                          className="btn btn-secondary justify-start"
                        >
                          <span className="mono">{v.plate}</span>&nbsp;— {v.model}
                        </button>
                      ))}
                    </div>
                  )}
                  {plateSearch && matchingVehicles.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--crit)" }}>
                      Placa nao encontrada no cadastro. Sera salva como texto livre (veiculo locado/terceiro).
                    </span>
                  )}
                </div>
              )}
            </FormSection>

            <FormSection label="Infracao">
              <div className="grid grid-cols-2 gap-3">
                <Field label="No do auto de infracao">
                  <input
                    className="input"
                    value={form.auto_number}
                    onChange={(e) => setForm({ ...form, auto_number: e.target.value })}
                  />
                </Field>
                <Field label="Numero Renainf">
                  <input
                    className="input"
                    value={form.renainf_number}
                    onChange={(e) => setForm({ ...form, renainf_number: e.target.value })}
                  />
                </Field>
                <Field label="Renainf multa original">
                  <input
                    className="input"
                    value={form.renainf_original}
                    onChange={(e) => setForm({ ...form, renainf_original: e.target.value })}
                  />
                </Field>
                <Field label="No de pontos">
                  <input
                    type="number"
                    className="input"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: e.target.value })}
                  />
                </Field>
                <Field label="Data da infracao">
                  <input
                    type="date"
                    className="input"
                    value={form.infraction_date}
                    onChange={(e) => setForm({ ...form, infraction_date: e.target.value })}
                  />
                </Field>
                <Field label="Local da infracao">
                  <input
                    className="input"
                    value={form.infraction_location}
                    onChange={(e) => setForm({ ...form, infraction_location: e.target.value })}
                  />
                </Field>
                <Field label="Codigo da infracao">
                  <input
                    className="input"
                    value={form.infraction_code}
                    onChange={(e) => setForm({ ...form, infraction_code: e.target.value })}
                  />
                </Field>
                <Field label="Codigo do orgao">
                  <input
                    className="input"
                    value={form.issuing_body_code}
                    onChange={(e) => setForm({ ...form, issuing_body_code: e.target.value })}
                  />
                </Field>
                <Field label="Orgao autuador">
                  <input
                    className="input"
                    value={form.issuing_body}
                    onChange={(e) => setForm({ ...form, issuing_body: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Descricao da infracao">
                <textarea
                  className="input"
                  rows={2}
                  value={form.infraction_description}
                  onChange={(e) => setForm({ ...form, infraction_description: e.target.value })}
                />
              </Field>
            </FormSection>

            <FormSection label="Indicacao do condutor">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Real infrator / condutor">
                  <input
                    className="input"
                    value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                  />
                </Field>
                <Field label="Data limite p/ indicacao">
                  <input
                    type="date"
                    className="input"
                    value={form.indication_deadline}
                    onChange={(e) => setForm({ ...form, indication_deadline: e.target.value })}
                  />
                </Field>
                <Field label="Data envio formulario">
                  <input
                    type="date"
                    className="input"
                    value={form.form_sent_date}
                    onChange={(e) => setForm({ ...form, form_sent_date: e.target.value })}
                  />
                </Field>
                <Field label="Responsavel por receber formulario">
                  <input
                    className="input"
                    value={form.form_received_by}
                    onChange={(e) => setForm({ ...form, form_received_by: e.target.value })}
                  />
                </Field>
                <Field label="Data protocolo / postagem">
                  <input
                    type="date"
                    className="input"
                    value={form.protocol_date}
                    onChange={(e) => setForm({ ...form, protocol_date: e.target.value })}
                  />
                </Field>
                <Field label="Forma de identificacao">
                  <input
                    className="input"
                    value={form.identification_method}
                    onChange={(e) => setForm({ ...form, identification_method: e.target.value })}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection label="Financeiro">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Valor da multa (R$)">
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </Field>
                <Field label="Desconto (R$)">
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  />
                </Field>
                <Field label="Valor real pago (R$)">
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={form.amount_paid}
                    onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                  />
                </Field>
                <Field label="Data de vencimento">
                  <input
                    type="date"
                    className="input"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </Field>
                <Field label="Boleto / situacao financeira">
                  <input
                    className="input"
                    value={form.invoice_status}
                    onChange={(e) => setForm({ ...form, invoice_status: e.target.value })}
                    placeholder="Ex: Boleto, Banco/Renavam, Localiza..."
                  />
                </Field>
                <Field label="Numero de lancamento no CIGAM">
                  <input
                    className="input"
                    value={form.cigam_launch_number}
                    onChange={(e) => setForm({ ...form, cigam_launch_number: e.target.value })}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection label="Desconto / RH">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Valor lancado p/ desconto?">
                  <select
                    className="input"
                    value={form.discount_launched}
                    onChange={(e) => setForm({ ...form, discount_launched: e.target.value })}
                  >
                    <option value="">-</option>
                    <option value="SIM">Sim</option>
                    <option value="NAO">Nao</option>
                    <option value="NA">N/A</option>
                  </select>
                </Field>
                <Field label="Data do lancamento">
                  <input
                    type="date"
                    className="input"
                    value={form.discount_launch_date}
                    onChange={(e) => setForm({ ...form, discount_launch_date: e.target.value })}
                  />
                </Field>
                <Field label="Forma do desconto">
                  <input
                    className="input"
                    value={form.discount_method}
                    onChange={(e) => setForm({ ...form, discount_method: e.target.value })}
                    placeholder="Ex: Comissao, Pernoite, PIX, Folha..."
                  />
                </Field>
                <Field label="Desconto efetuado?">
                  <select
                    className="input"
                    value={form.discount_completed}
                    onChange={(e) => setForm({ ...form, discount_completed: e.target.value })}
                  >
                    <option value="">-</option>
                    <option value="SIM">Sim</option>
                    <option value="NAO">Nao</option>
                    <option value="PARCELADO">Parcelado</option>
                    <option value="NA">N/A</option>
                  </select>
                </Field>
                <Field label="Data de efetivacao">
                  <input
                    type="date"
                    className="input"
                    value={form.discount_completion_date}
                    onChange={(e) => setForm({ ...form, discount_completion_date: e.target.value })}
                  />
                </Field>
              </div>
            </FormSection>

            <Field label="Observacoes internas">
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            {form.file_name && (
              <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                Anexo: {form.file_name}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
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

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value ?? "-"}</div>
    </div>
  );
}

function FineDetailPanel({
  fine,
  onEdit,
  onFlow,
  canEdit,
}: {
  fine: Fine;
  onEdit: () => void;
  onFlow: () => void;
  canEdit: boolean;
}) {
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/fines/${fine.id}/historico`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setHistory(d.history ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [fine.id]);

  return (
    <div className="fines-detail-panel">
      <div className="fines-detail-grid">
        <FormSection label="Identificacao">
          <div className="detail-grid">
            <DetailField label="Ano" value={fine.year} />
            <DetailField label="Setor responsavel" value={fine.department_name ?? fine.department} />
            <DetailField label="Frota / propriedade" value={fine.fleet_company} />
            <DetailField label="Tipo" value={fine.fine_type === "segunda" ? "2a multa" : "1a multa"} />
            <DetailField label="Cadastrada em" value={formatDate(fine.registered_at)} />
            <DetailField label="Origem" value={fine.source} />
          </div>
        </FormSection>

        <FormSection label="Veiculo">
          <div className="detail-grid">
            <DetailField label="Placa" value={fine.vehicle_plate ?? fine.plate_raw} />
            <DetailField label="Modelo" value={fine.vehicle_model} />
          </div>
        </FormSection>

        <FormSection label="Infracao">
          <div className="detail-grid">
            <DetailField label="No do auto de infracao" value={fine.auto_number} />
            <DetailField label="Numero Renainf" value={fine.renainf_number} />
            <DetailField label="Renainf multa original" value={fine.renainf_original} />
            <DetailField label="No de pontos" value={fine.points} />
            <DetailField label="Data da infracao" value={formatDate(fine.infraction_date)} />
            <DetailField label="Local da infracao" value={fine.infraction_location} />
            <DetailField label="Codigo da infracao" value={fine.infraction_code} />
            <DetailField label="Codigo do orgao" value={fine.issuing_body_code} />
            <DetailField label="Orgao autuador" value={fine.issuing_body} />
          </div>
          <DetailField label="Descricao da infracao" value={fine.infraction_description} />
        </FormSection>

        <FormSection label="Indicacao do condutor">
          <div className="detail-grid">
            <DetailField label="Real infrator / condutor" value={fine.driver_name} />
            <DetailField label="Data limite p/ indicacao" value={formatDate(fine.indication_deadline)} />
            <DetailField label="Data envio formulario" value={formatDate(fine.form_sent_date)} />
            <DetailField label="Responsavel por receber formulario" value={fine.form_received_by} />
            <DetailField label="Data protocolo / postagem" value={formatDate(fine.protocol_date)} />
            <DetailField label="Forma de identificacao" value={fine.identification_method} />
          </div>
        </FormSection>

        <FormSection label="Financeiro">
          <div className="detail-grid">
            <DetailField label="Valor da multa" value={formatCents(fine.amount_cents)} />
            <DetailField label="Desconto" value={formatCents(fine.discount_cents)} />
            <DetailField label="Valor real pago" value={formatCents(fine.amount_paid_cents)} />
            <DetailField label="Data de vencimento" value={formatDate(fine.due_date)} />
            <DetailField label="Boleto / situacao financeira" value={fine.invoice_status} />
            <DetailField label="Numero de lancamento no CIGAM" value={fine.cigam_launch_number} />
          </div>
        </FormSection>

        <FormSection label="Fluxo interno">
          <div className="detail-grid">
            <DetailField label="Responsavel" value={fine.flow_responsible_name} />
            <DetailField label="E-mail do responsavel" value={fine.flow_responsible_email} />
            <DetailField label="Situacao do responsavel" value={FLOW_STAGE_STATUS_LABEL[fine.flow_responsible_status]} />
            <DetailField label="Situacao do departamento" value={FLOW_STAGE_STATUS_LABEL[fine.flow_department_status]} />
            <DetailField label="Situacao no RH" value={FLOW_STAGE_STATUS_LABEL[fine.flow_rh_status]} />
            <DetailField label="Forma do desconto" value={fine.discount_method} />
            <DetailField label="Quantidade de parcelas" value={fine.discount_installments} />
            <DetailField label="Data de efetivacao" value={formatDate(fine.discount_completion_date)} />
            <DetailField label="Situacao financeira" value={FLOW_STAGE_STATUS_LABEL[fine.flow_financial_status]} />
          </div>
          {fine.notes && (
            <DetailField label="Observacoes internas" value={fine.notes} />
          )}
        </FormSection>

        {fine.file_name && (
          <FormSection label="Anexo">
            <a href={`/api/fines/${fine.id}/arquivo`} target="_blank" rel="noreferrer" className="btn btn-secondary">
              Ver {fine.file_name}
            </a>
          </FormSection>
        )}

        <FormSection label="Historico">
          {!history && <div className="muted text-xs">Carregando...</div>}
          {history && history.length === 0 && <div className="muted text-xs">Sem alteracoes registradas.</div>}
          {history && history.length > 0 && (
            <div className="flex flex-col gap-2">
              {history.map((h) => (
                <div key={h.id} className="text-xs" style={{ borderLeft: "2px solid var(--line)", paddingLeft: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{h.user_name}</span>{" "}
                    {h.old_value === null && h.new_value !== null && h.field_label === "Multa cadastrada" ? (
                      <>cadastrou a multa ({h.new_value}).</>
                    ) : (
                      <>
                        alterou <b>{h.field_label}</b> de &ldquo;{h.old_value ?? "Nao identificado"}&rdquo; para
                        &ldquo;{h.new_value ?? "-"}&rdquo;.
                      </>
                    )}
                  </div>
                  <div className="muted mono">{h.created_at}</div>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      </div>

      <div className="flex justify-end gap-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
        <button type="button" onClick={onFlow} className="btn btn-secondary">
          Abrir etapa / fluxo
        </button>
        {canEdit && (
          <button type="button" onClick={onEdit} className="btn btn-primary">
            Editar dados oficiais
          </button>
        )}
      </div>
    </div>
  );
}

function ImportPdfModal({
  importing,
  error,
  onClose,
  onFile,
}: {
  importing: boolean;
  error: string | null;
  onClose: () => void;
  onFile: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(20, 24, 31, 0.45)" }}
    >
      <div
        className="card w-full max-w-md p-6 flex flex-col gap-4"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-md)" }}
      >
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
            Importar notificacao de multa em PDF
          </h2>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            O documento sera lido automaticamente. Voce revisa e edita tudo antes de salvar.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {!file ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
            className="flex flex-col items-center justify-center gap-2 p-8 rounded-md cursor-pointer text-center"
            style={{
              border: `2px dashed ${dragOver ? "var(--accent)" : "var(--line-strong)"}`,
              background: dragOver ? "var(--accent-bg)" : "var(--surface-2)",
            }}
          >
            <span className="text-sm font-medium">Arraste o PDF aqui ou clique para selecionar</span>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              Somente arquivos .pdf, ate 20MB
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <div className="card p-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium truncate">{file.name}</span>
            {!importing && (
              <button type="button" onClick={() => setFile(null)} className="btn btn-ghost">
                Remover
              </button>
            )}
          </div>
        )}

        {importing && (
          <div className="text-sm" style={{ color: "var(--text-dim)" }}>
            Lendo o documento com IA...
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
          <button type="button" onClick={onClose} disabled={importing} className="btn btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => file && onFile(file)}
            disabled={!file || importing}
            className="btn btn-primary"
          >
            {importing ? "Processando..." : "Iniciar leitura"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlowModal({
  fine,
  form,
  setForm,
  saving,
  error,
  canEdit,
  departments,
  onClose,
  onSubmit,
}: {
  fine: Fine;
  form: FlowFormState;
  setForm: (form: FlowFormState) => void;
  saving: boolean;
  error: string | null;
  canEdit: boolean;
  departments: Department[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(20, 24, 31, 0.45)" }}
    >
      <form
        onSubmit={onSubmit}
        className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="p-6 pb-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="section-label" style={{ marginBottom: 6 }}>
            Responsavel - Departamento - RH - Financeiro
          </div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            Fluxo interno da autuacao
          </h2>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {fine.auto_number ?? fine.id} - {fine.vehicle_plate ?? fine.plate_raw ?? "-"} - distribua as
            proximas acoes sem alterar os dados oficiais da infracao.
          </p>
        </div>

        <div className="flow-summary-strip">
          <div>
            <div className="label">Autuacao</div>
            <div className="value">{fine.auto_number ?? "-"}</div>
            <div className="note truncate">{fine.infraction_description ?? "-"}</div>
          </div>
          <div>
            <div className="label">Condutor</div>
            <div className="value">{fine.driver_name ?? "Nao identificado"}</div>
            <div className="note">{fine.identification_method ?? "-"}</div>
          </div>
          <div>
            <div className="label">Valor</div>
            <div className="value">{formatCents(fine.amount_cents)}</div>
            <div className="note">
              {fine.due_date ? `Vencimento ${formatDate(fine.due_date)}` : "Vencimento nao informado"}
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error mx-6 mt-4">{error}</div>}

        {!canEdit && (
          <div className="alert mx-6 mt-4" style={{ background: "var(--surface-2)", color: "var(--text-dim)" }}>
            Visualizacao publica: os campos abaixo sao somente leitura.
          </div>
        )}

        <fieldset disabled={!canEdit} className="p-6 flex flex-col gap-5 border-0 m-0">
          <FlowStep num={1} title="Departamento e responsavel" desc="Quem deve identificar o condutor e acompanhar a resposta.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Departamento / setor">
                <select
                  className="input"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                >
                  <option value="">-</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Responsavel">
                <input
                  className="input"
                  placeholder="Nome do gestor ou responsavel"
                  value={form.flow_responsible_name}
                  onChange={(e) => setForm({ ...form, flow_responsible_name: e.target.value })}
                />
              </Field>
              <Field label="E-mail do responsavel">
                <input
                  className="input"
                  placeholder="opcional"
                  value={form.flow_responsible_email}
                  onChange={(e) => setForm({ ...form, flow_responsible_email: e.target.value })}
                />
              </Field>
              <Field label="Situacao do responsavel">
                <select
                  className="input"
                  value={form.flow_responsible_status}
                  onChange={(e) => setForm({ ...form, flow_responsible_status: e.target.value as FlowStageStatus })}
                >
                  {FLOW_STAGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FLOW_STAGE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Situacao do departamento">
                <select
                  className="input"
                  value={form.flow_department_status}
                  onChange={(e) => setForm({ ...form, flow_department_status: e.target.value as FlowStageStatus })}
                >
                  {FLOW_STAGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FLOW_STAGE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FlowStep>

          <FlowStep num={2} title="Tratamento pelo RH" desc="Autorizacao, forma e competencia do desconto.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Situacao no RH">
                <select
                  className="input"
                  value={form.flow_rh_status}
                  onChange={(e) => setForm({ ...form, flow_rh_status: e.target.value as FlowStageStatus })}
                >
                  {FLOW_STAGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FLOW_STAGE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Forma do desconto">
                <input
                  className="input"
                  placeholder="Ex: Folha, PIX, Comissao..."
                  value={form.discount_method}
                  onChange={(e) => setForm({ ...form, discount_method: e.target.value })}
                />
              </Field>
              <Field label="Quantidade de parcelas">
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={form.discount_installments}
                  onChange={(e) => setForm({ ...form, discount_installments: e.target.value })}
                />
              </Field>
              <Field label="Data de efetivacao">
                <input
                  type="date"
                  className="input"
                  value={form.discount_completion_date}
                  onChange={(e) => setForm({ ...form, discount_completion_date: e.target.value })}
                />
              </Field>
            </div>
          </FlowStep>

          <FlowStep num={3} title="Financeiro" desc="Pagamento e vinculo com o lancamento contabil.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Situacao financeira">
                <select
                  className="input"
                  value={form.flow_financial_status}
                  onChange={(e) => setForm({ ...form, flow_financial_status: e.target.value as FlowStageStatus })}
                >
                  {FLOW_STAGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FLOW_STAGE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Numero do lancamento no CIGAM">
                <input
                  className="input"
                  value={form.cigam_launch_number}
                  onChange={(e) => setForm({ ...form, cigam_launch_number: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Observacoes internas">
              <textarea
                className="input"
                rows={3}
                placeholder="Registre decisoes, contatos e pendencias."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </FlowStep>
        </fieldset>

        <div className="flex justify-end gap-2 p-4" style={{ borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {canEdit ? "Cancelar" : "Fechar"}
          </button>
          {canEdit && (
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Salvando..." : "Salvar e distribuir fluxo"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function FlowStep({
  num,
  title,
  desc,
  children,
}: {
  num: number;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flow-step">
      <div className="flow-step-num">{num}</div>
      <div className="flex-1 flex flex-col gap-3">
        <div>
          <div className="flow-step-title">{title}</div>
          <div className="flow-step-desc">{desc}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ScopedModalShell({
  title,
  subtitle,
  fine,
  error,
  saving,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  subtitle: string;
  fine: Fine;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(20, 24, 31, 0.45)" }}
    >
      <form
        onSubmit={onSubmit}
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-md)" }}
      >
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
            {title}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {fine.auto_number ?? fine.id} · {fine.vehicle_plate ?? fine.plate_raw ?? "-"} · {subtitle}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {children}

        <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SetorModal({
  fine,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  fine: Fine;
  form: SetorFormState;
  setForm: (f: SetorFormState) => void;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <ScopedModalShell
      title="Indicacao do condutor"
      subtitle={fine.department_name ?? fine.department ?? "setor"}
      fine={fine}
      error={error}
      saving={saving}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Real infrator / condutor">
          <input
            className="input"
            value={form.driver_name}
            onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
          />
        </Field>
        <Field label="Forma de identificacao">
          <input
            className="input"
            value={form.identification_method}
            onChange={(e) => setForm({ ...form, identification_method: e.target.value })}
          />
        </Field>
        <Field label="Data envio formulario">
          <input
            type="date"
            className="input"
            value={form.form_sent_date}
            onChange={(e) => setForm({ ...form, form_sent_date: e.target.value })}
          />
        </Field>
        <Field label="Responsavel por receber formulario">
          <input
            className="input"
            value={form.form_received_by}
            onChange={(e) => setForm({ ...form, form_received_by: e.target.value })}
          />
        </Field>
        <Field label="Data protocolo / postagem">
          <input
            type="date"
            className="input"
            value={form.protocol_date}
            onChange={(e) => setForm({ ...form, protocol_date: e.target.value })}
          />
        </Field>
      </div>
    </ScopedModalShell>
  );
}

function FinanceiroModal({
  fine,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  fine: Fine;
  form: FinanceiroFormState;
  setForm: (f: FinanceiroFormState) => void;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <ScopedModalShell
      title="Financeiro"
      subtitle={`valor ${formatCents(fine.amount_cents)}`}
      fine={fine}
      error={error}
      saving={saving}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor real pago (R$)">
          <input
            type="number"
            step="0.01"
            className="input"
            value={form.amount_paid}
            onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
          />
        </Field>
        <Field label="Data de vencimento">
          <input
            type="date"
            className="input"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </Field>
        <Field label="Boleto / situacao financeira">
          <input
            className="input"
            placeholder="Ex: Boleto, Banco/Renavam, Localiza..."
            value={form.invoice_status}
            onChange={(e) => setForm({ ...form, invoice_status: e.target.value })}
          />
        </Field>
        <Field label="Numero de lancamento no CIGAM">
          <input
            className="input"
            value={form.cigam_launch_number}
            onChange={(e) => setForm({ ...form, cigam_launch_number: e.target.value })}
          />
        </Field>
        <Field label="Situacao financeira">
          <select
            className="input"
            value={form.flow_financial_status}
            onChange={(e) => setForm({ ...form, flow_financial_status: e.target.value as FlowStageStatus })}
          >
            {FLOW_STAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {FLOW_STAGE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Ao informar o valor pago igual ou maior que o valor da multa, o status avanca automaticamente para
        &ldquo;Pagto. realizado&rdquo;.
      </p>
    </ScopedModalShell>
  );
}

function RhModal({
  fine,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  fine: Fine;
  form: RhFormState;
  setForm: (f: RhFormState) => void;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <ScopedModalShell
      title="Desconto / RH"
      subtitle={fine.driver_name ?? "condutor nao identificado"}
      fine={fine}
      error={error}
      saving={saving}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor lancado p/ desconto?">
          <select
            className="input"
            value={form.discount_launched}
            onChange={(e) => setForm({ ...form, discount_launched: e.target.value })}
          >
            <option value="">-</option>
            <option value="SIM">Sim</option>
            <option value="NAO">Nao</option>
            <option value="NA">N/A</option>
          </select>
        </Field>
        <Field label="Data do lancamento">
          <input
            type="date"
            className="input"
            value={form.discount_launch_date}
            onChange={(e) => setForm({ ...form, discount_launch_date: e.target.value })}
          />
        </Field>
        <Field label="Forma do desconto">
          <input
            className="input"
            placeholder="Ex: Comissao, Pernoite, PIX, Folha..."
            value={form.discount_method}
            onChange={(e) => setForm({ ...form, discount_method: e.target.value })}
          />
        </Field>
        <Field label="Quantidade de parcelas">
          <input
            type="number"
            min={1}
            className="input"
            value={form.discount_installments}
            onChange={(e) => setForm({ ...form, discount_installments: e.target.value })}
          />
        </Field>
        <Field label="Desconto efetuado?">
          <select
            className="input"
            value={form.discount_completed}
            onChange={(e) => setForm({ ...form, discount_completed: e.target.value })}
          >
            <option value="">-</option>
            <option value="SIM">Sim</option>
            <option value="NAO">Nao</option>
            <option value="PARCELADO">Parcelado</option>
            <option value="NA">N/A</option>
          </select>
        </Field>
        <Field label="Data de efetivacao">
          <input
            type="date"
            className="input"
            value={form.discount_completion_date}
            onChange={(e) => setForm({ ...form, discount_completion_date: e.target.value })}
          />
        </Field>
        <Field label="Situacao no RH">
          <select
            className="input"
            value={form.flow_rh_status}
            onChange={(e) => setForm({ ...form, flow_rh_status: e.target.value as FlowStageStatus })}
          >
            {FLOW_STAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {FLOW_STAGE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </ScopedModalShell>
  );
}
