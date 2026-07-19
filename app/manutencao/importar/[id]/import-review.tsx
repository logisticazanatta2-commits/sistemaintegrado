"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import {
  FINANCIAL_STATUSES,
  FINANCIAL_STATUS_LABEL,
  IMPORT_STATUS_LABEL,
  ITEM_CATEGORIES,
  type ExtractedDocument,
  type ExtractedItem,
  type FinancialStatus,
  type ImportStatus,
  type ItemType,
} from "@/lib/pdf-import";
import type { Vehicle } from "@/lib/vehicles";

interface ImportRecord {
  id: number;
  vehicle_id: number | null;
  work_order_id: number | null;
  status: ImportStatus;
  error_message: string | null;
  file_name: string;
  odometer_extracted: number | null;
  total_cents: number | null;
  total_calculated_cents: number | null;
  financial_status: FinancialStatus;
  duplicate_of_import_id: number | null;
  extracted: ExtractedDocument;
  vehicle: {
    id: number;
    plate: string | null;
    model: string;
    category: string;
    odometer: number;
    odometer_reference_date: string | null;
  } | null;
}

function centsToReais(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2);
}
function reaisToCents(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function formatCents(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_TONE: Record<ImportStatus, "ok" | "warn" | "crit" | "neutral" | "info"> = {
  enviado: "neutral",
  processando: "info",
  extraido: "info",
  revisao_necessaria: "warn",
  rascunho: "neutral",
  confirmado: "ok",
  erro: "crit",
  cancelado: "neutral",
  duplicado: "crit",
};

export default function ImportReview({ importId }: { importId: number }) {
  const [record, setRecord] = useState<ImportRecord | null>(null);
  const [extracted, setExtracted] = useState<ExtractedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmedWorkOrderId, setConfirmedWorkOrderId] = useState<number | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [financialStatus, setFinancialStatus] = useState<FinancialStatus>("orcamento_recebido");
  const [updateOdometer, setUpdateOdometer] = useState(true);
  const [duplicateReason, setDuplicateReason] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manutencao/importar-pdf/${importId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar importacao.");
      const rec = data.import as ImportRecord;
      setRecord(rec);
      setExtracted(rec.extracted);
      setVehicleId(rec.vehicle_id);
      setFinancialStatus(rec.financial_status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
      fetch("/api/vehicles")
        .then((r) => r.json())
        .then((d) => setVehicles(d.vehicles ?? []));
    }, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? record?.vehicle ?? null,
    [vehicles, vehicleId, record]
  );

  const matchingVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return [];
    return vehicles
      .filter((v) => v.plate?.toLowerCase().includes(q) || v.model.toLowerCase().includes(q))
      .slice(0, 8);
  }, [vehicles, vehicleSearch]);

  const productos = useMemo(() => extracted?.items.filter((i) => i.type === "produto") ?? [], [extracted]);
  const servicos = useMemo(() => extracted?.items.filter((i) => i.type === "servico") ?? [], [extracted]);

  const productsTotal = useMemo(() => productos.reduce((s, i) => s + i.total_cents, 0), [productos]);
  const servicesTotal = useMemo(() => servicos.reduce((s, i) => s + i.total_cents, 0), [servicos]);
  const calculatedTotal = useMemo(() => {
    if (!extracted) return 0;
    return productsTotal + servicesTotal - (extracted.discount_cents ?? 0) + (extracted.surcharge_cents ?? 0);
  }, [productsTotal, servicesTotal, extracted]);

  const totalDivergence =
    extracted?.total_cents !== null && extracted?.total_cents !== undefined
      ? calculatedTotal - extracted.total_cents
      : null;

  const odometerDiff =
    extracted?.odometer && selectedVehicle ? extracted.odometer - selectedVehicle.odometer : null;

  function updateExtracted(patch: Partial<ExtractedDocument>) {
    setExtracted((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateItem(index: number, type: ItemType, patch: Partial<ExtractedItem>) {
    if (!extracted) return;
    const list = type === "produto" ? productos : servicos;
    const target = list[index];
    const items = extracted.items.map((i) => (i === target ? { ...i, ...patch } : i));
    updateExtracted({ items });
  }

  function removeItem(index: number, type: ItemType) {
    if (!extracted) return;
    const list = type === "produto" ? productos : servicos;
    const target = list[index];
    updateExtracted({ items: extracted.items.filter((i) => i !== target) });
  }

  function addItem(type: ItemType) {
    if (!extracted) return;
    const newItem: ExtractedItem = {
      type,
      code: null,
      description: "",
      quantity: 1,
      unit: null,
      unit_price_cents: 0,
      discount_cents: 0,
      total_cents: 0,
      category: "Outros",
      confidence: "alta",
    };
    updateExtracted({ items: [...extracted.items, newItem] });
  }

  function updateObservationLine(index: number, value: string) {
    if (!extracted) return;
    const observations = extracted.observations.map((o, i) => (i === index ? value : o));
    updateExtracted({ observations });
  }

  async function persistDraft(overrides?: { status?: "rascunho" }) {
    if (!extracted) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/manutencao/importar-pdf/${importId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extracted,
          vehicle_id: vehicleId,
          financial_status: financialStatus,
          ...overrides,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.");
      setRecord(data.import);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelImport() {
    if (!confirm("Cancelar esta importacao? O documento nao sera lancado no historico.")) return;
    await fetch(`/api/manutencao/importar-pdf/${importId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelado" }),
    });
    await load();
  }

  async function overrideDuplicate() {
    if (!duplicateReason.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/manutencao/importar-pdf/${importId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicate_override_reason: duplicateReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecord(data.import);
    } finally {
      setSaving(false);
    }
  }

  async function confirmImport() {
    await persistDraft();
    setConfirmError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/manutencao/importar-pdf/${importId}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_odometer: updateOdometer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao confirmar importacao.");
      setConfirmedWorkOrderId(data.work_order_id);
      await load();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  const canConfirm =
    !!vehicleId &&
    !!extracted &&
    (!!extracted.issue_date || !!extracted.service_date) &&
    extracted.items.length > 0 &&
    record?.status !== "confirmado" &&
    record?.status !== "cancelado";

  if (loading) {
    return <div style={{ color: "var(--text-faint)" }}>Carregando...</div>;
  }
  if (error && !record) {
    return <div className="alert alert-error">{error}</div>;
  }
  if (!record || !extracted) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[record.status]}>{IMPORT_STATUS_LABEL[record.status]}</Badge>
          <span className="text-sm" style={{ color: "var(--text-dim)" }}>
            {record.file_name}
          </span>
        </div>
        <Link href="/manutencao" className="btn btn-secondary">
          Voltar para Manutencao
        </Link>
      </div>

      {record.status === "confirmado" && (
        <div className="alert" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
          Importacao confirmada e lancada no historico de manutencao.
          {confirmedWorkOrderId && <> OS #{confirmedWorkOrderId} criada.</>}
        </div>
      )}
      {record.status === "erro" && record.error_message && (
        <div className="alert alert-error">{record.error_message}</div>
      )}
      {record.status === "duplicado" && (
        <div className="alert alert-error flex flex-col gap-2">
          <span>
            Possivel importacao duplicada encontrada (documento ja importado anteriormente, id #
            {record.duplicate_of_import_id}).
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Justificativa para continuar mesmo assim (somente administrador)"
              value={duplicateReason}
              onChange={(e) => setDuplicateReason(e.target.value)}
            />
            <button
              onClick={overrideDuplicate}
              disabled={!duplicateReason.trim() || saving}
              className="btn btn-secondary"
            >
              Continuar mesmo assim
            </button>
          </div>
        </div>
      )}
      {confirmError && <div className="alert alert-error">{confirmError}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-5">
          <section className="card p-5 flex flex-col gap-3">
            <div className="section-label">Identificacao do documento</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select
                  className="input"
                  value={extracted.doc_type ?? ""}
                  onChange={(e) => updateExtracted({ doc_type: (e.target.value || null) as ExtractedDocument["doc_type"] })}
                >
                  <option value="">-</option>
                  <option value="orcamento">Orcamento</option>
                  <option value="ordem_servico">Ordem de servico</option>
                  <option value="nota_fiscal">Nota fiscal</option>
                  <option value="outro">Outro</option>
                </select>
              </Field>
              <Field label="Numero do orcamento">
                <input
                  className="input"
                  value={extracted.doc_number ?? ""}
                  onChange={(e) => updateExtracted({ doc_number: e.target.value || null })}
                />
              </Field>
              <Field label="Numero da OS">
                <input
                  className="input"
                  value={extracted.os_number ?? ""}
                  onChange={(e) => updateExtracted({ os_number: e.target.value || null })}
                />
              </Field>
              <Field label="Numero da nota fiscal">
                <input
                  className="input"
                  value={extracted.invoice_number ?? ""}
                  onChange={(e) => updateExtracted({ invoice_number: e.target.value || null })}
                />
              </Field>
              <Field label="Data de emissao *">
                <input
                  type="date"
                  className="input"
                  value={extracted.issue_date ?? ""}
                  onChange={(e) => updateExtracted({ issue_date: e.target.value || null })}
                />
              </Field>
              <Field label="Data de atendimento">
                <input
                  type="date"
                  className="input"
                  value={extracted.service_date ?? ""}
                  onChange={(e) => updateExtracted({ service_date: e.target.value || null })}
                />
              </Field>
              <Field label="Fornecedor / oficina">
                <input
                  className="input"
                  value={extracted.supplier_name ?? ""}
                  onChange={(e) => updateExtracted({ supplier_name: e.target.value || null })}
                />
              </Field>
              <Field label="CNPJ / CPF fornecedor">
                <input
                  className="input"
                  value={extracted.supplier_document ?? ""}
                  onChange={(e) => updateExtracted({ supplier_document: e.target.value || null })}
                />
              </Field>
              <Field label="Responsavel">
                <input
                  className="input"
                  value={extracted.responsible_name ?? ""}
                  onChange={(e) => updateExtracted({ responsible_name: e.target.value || null })}
                />
              </Field>
              <Field label="Situacao financeira/operacional">
                <select
                  className="input"
                  value={financialStatus}
                  onChange={(e) => setFinancialStatus(e.target.value as FinancialStatus)}
                >
                  {FINANCIAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FINANCIAL_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="card p-5 flex flex-col gap-3">
            <div className="section-label">Veiculo</div>
            {selectedVehicle ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="mono font-medium" style={{ color: "var(--ink)" }}>
                    {selectedVehicle.plate}
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-dim)" }}>
                    {selectedVehicle.model}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVehicleId(null);
                  }}
                  className="btn btn-ghost"
                >
                  Trocar veiculo
                </button>
              </div>
            ) : (
              <div className="alert alert-error flex flex-col gap-2">
                <span>
                  Placa nao encontrada no cadastro
                  {extracted.plate ? ` ("${extracted.plate}")` : ""}. Selecione um veiculo existente.
                </span>
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar por placa ou modelo..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />
                {matchingVehicles.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {matchingVehicles.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setVehicleId(v.id);
                            setVehicleSearch("");
                          }}
                          className="btn btn-secondary w-full justify-start"
                        >
                          <span className="mono">{v.plate ?? v.asset_code}</span>&nbsp;— {v.model}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/veiculos" className="text-sm" style={{ color: "var(--accent-hover)" }}>
                  Ir para o cadastro de veiculos →
                </Link>
              </div>
            )}

            {selectedVehicle && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="KM no documento">
                  <input
                    type="number"
                    className="input"
                    value={extracted.odometer ?? ""}
                    onChange={(e) => updateExtracted({ odometer: e.target.value ? Number(e.target.value) : null })}
                  />
                </Field>
                <Field label="KM atual do sistema">
                  <div className="input" style={{ background: "var(--surface-2)", color: "var(--text-dim)" }}>
                    {selectedVehicle.odometer.toLocaleString("pt-BR")} km
                  </div>
                </Field>
              </div>
            )}

            {selectedVehicle && odometerDiff !== null && (
              <div
                className="text-sm"
                style={{ color: odometerDiff < 0 ? "var(--crit)" : "var(--text-dim)" }}
              >
                {odometerDiff > 0 &&
                  `Hodometro do documento e ${odometerDiff.toLocaleString("pt-BR")} km maior que o atual. Podera atualizar o KM oficial do veiculo.`}
                {odometerDiff === 0 && "Hodometro do documento e igual ao ultimo registro do veiculo."}
                {odometerDiff < 0 &&
                  `Atencao: hodometro do documento e ${Math.abs(odometerDiff).toLocaleString("pt-BR")} km MENOR que o ultimo registro do veiculo. O KM oficial nao sera atualizado automaticamente.`}
              </div>
            )}

            {selectedVehicle && extracted.odometer !== null && (
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-dim)" }}>
                <input
                  type="checkbox"
                  checked={updateOdometer}
                  onChange={(e) => setUpdateOdometer(e.target.checked)}
                />
                Atualizar hodometro oficial do veiculo com o KM deste documento (quando valido)
              </label>
            )}
          </section>

          <section className="card p-5 flex flex-col gap-3">
            <div className="section-label">Observacoes e problemas relatados</div>
            <div className="flex flex-col gap-2">
              {extracted.observations.length === 0 && (
                <span className="text-sm" style={{ color: "var(--text-faint)" }}>
                  Nenhuma observacao identificada.
                </span>
              )}
              {extracted.observations.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={line}
                    onChange={(e) => updateObservationLine(i, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateExtracted({ observations: extracted.observations.filter((_, idx) => idx !== i) })
                    }
                    className="btn btn-danger-ghost"
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateExtracted({ observations: [...extracted.observations, ""] })}
                className="btn btn-secondary self-start"
              >
                + Linha
              </button>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3">
          <div className="section-label">Documento original</div>
          <div className="card overflow-hidden" style={{ height: 600 }}>
            <iframe
              src={`/api/manutencao/importar-pdf/${importId}/arquivo`}
              title="Documento PDF"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </div>
      </div>

      <ItemsTable
        title="Produtos"
        type="produto"
        items={productos}
        onUpdate={updateItem}
        onRemove={removeItem}
        onAdd={() => addItem("produto")}
      />
      <ItemsTable
        title="Servicos"
        type="servico"
        items={servicos}
        onUpdate={updateItem}
        onRemove={removeItem}
        onAdd={() => addItem("servico")}
      />

      <section className="card p-5 flex flex-col gap-3">
        <div className="section-label">Totais</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Produtos">
            <div className="input" style={{ background: "var(--surface-2)" }}>
              {formatCents(productsTotal)}
            </div>
          </Field>
          <Field label="Servicos">
            <div className="input" style={{ background: "var(--surface-2)" }}>
              {formatCents(servicesTotal)}
            </div>
          </Field>
          <Field label="Desconto">
            <input
              type="number"
              step="0.01"
              className="input"
              value={centsToReais(extracted.discount_cents)}
              onChange={(e) => updateExtracted({ discount_cents: reaisToCents(e.target.value) })}
            />
          </Field>
          <Field label="Acrescimo">
            <input
              type="number"
              step="0.01"
              className="input"
              value={centsToReais(extracted.surcharge_cents)}
              onChange={(e) => updateExtracted({ surcharge_cents: reaisToCents(e.target.value) })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Total calculado pelo sistema">
            <div className="input font-medium" style={{ background: "var(--surface-2)" }}>
              {formatCents(calculatedTotal)}
            </div>
          </Field>
          <Field label="Total informado no documento">
            <input
              type="number"
              step="0.01"
              className="input"
              value={centsToReais(extracted.total_cents)}
              onChange={(e) => updateExtracted({ total_cents: reaisToCents(e.target.value) })}
            />
          </Field>
          <div className="flex items-end">
            {totalDivergence === null ? (
              <span className="text-sm" style={{ color: "var(--text-faint)" }}>
                Total do documento nao informado.
              </span>
            ) : totalDivergence === 0 ? (
              <Badge tone="ok">Valores conferidos</Badge>
            ) : (
              <div className="flex flex-col gap-0.5">
                <Badge tone="crit">Divergencia de valores</Badge>
                <span className="text-xs" style={{ color: "var(--crit)" }}>
                  Diferenca: {formatCents(totalDivergence)}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div
        className="flex justify-end gap-2 sticky bottom-0 p-4 -mx-6 md:-mx-8"
        style={{ background: "var(--paper)", borderTop: "1px solid var(--line)" }}
      >
        <button onClick={cancelImport} className="btn btn-danger-ghost">
          Descartar importacao
        </button>
        <button onClick={() => persistDraft({ status: "rascunho" })} disabled={saving} className="btn btn-secondary">
          Salvar como rascunho
        </button>
        <button onClick={confirmImport} disabled={!canConfirm || saving} className="btn btn-primary">
          {saving ? "Confirmando..." : "Confirmar importacao"}
        </button>
      </div>
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

function ItemsTable({
  title,
  type,
  items,
  onUpdate,
  onRemove,
  onAdd,
}: {
  title: string;
  type: ItemType;
  items: ExtractedItem[];
  onUpdate: (index: number, type: ItemType, patch: Partial<ExtractedItem>) => void;
  onRemove: (index: number, type: ItemType) => void;
  onAdd: () => void;
}) {
  return (
    <section className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="section-label">{title}</div>
        <button type="button" onClick={onAdd} className="btn btn-secondary">
          + Item
        </button>
      </div>
      {items.length === 0 ? (
        <span className="text-sm" style={{ color: "var(--text-faint)" }}>
          Nenhum item nesta categoria.
        </span>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Descricao</th>
                <th>Qtd.</th>
                <th>Vlr. unitario</th>
                <th>Vlr. total</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className="input"
                      value={item.description}
                      onChange={(e) => onUpdate(i, type, { description: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      style={{ width: "5.5rem" }}
                      value={item.quantity}
                      onChange={(e) => onUpdate(i, type, { quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      style={{ width: "7rem" }}
                      value={centsToReais(item.unit_price_cents)}
                      onChange={(e) => {
                        const cents = reaisToCents(e.target.value);
                        onUpdate(i, type, { unit_price_cents: cents, total_cents: cents * item.quantity });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      style={{ width: "7rem" }}
                      value={centsToReais(item.total_cents)}
                      onChange={(e) => onUpdate(i, type, { total_cents: reaisToCents(e.target.value) })}
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      value={item.category}
                      onChange={(e) => onUpdate(i, type, { category: e.target.value })}
                    >
                      {ITEM_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input"
                      value={item.type}
                      onChange={(e) => onUpdate(i, type, { type: e.target.value as ItemType })}
                    >
                      <option value="produto">Produto</option>
                      <option value="servico">Servico</option>
                    </select>
                  </td>
                  <td>
                    <button type="button" onClick={() => onRemove(i, type)} className="btn btn-danger-ghost">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
