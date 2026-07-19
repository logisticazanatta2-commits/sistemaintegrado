"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { StatCard } from "@/components/stat-card";
import {
  ODOMETER_FRESHNESS_LABEL,
  ODOMETER_FRESHNESS_TONE,
  ODOMETER_SOURCE_LABEL,
  ODOMETER_SOURCES,
  computeFreshness,
  type OdometerFreshness,
  type OdometerReading,
  type OdometerSource,
} from "@/lib/odometer";

interface FleetRow {
  id: number;
  plate: string | null;
  model: string;
  vehicle_type: string | null;
  responsible: string | null;
  status: string;
  last_odometer: number | null;
  last_reading_date: string | null;
  last_source: OdometerSource | null;
  prev_odometer: number | null;
  prev_reading_date: string | null;
}

interface ImportResult {
  fleet_total: number;
  rows_received: number;
  imported: number;
  invalid: { row: unknown; reason: string }[];
  not_found: { plate: string; odometer: number; reading_date: string }[];
  rejected: { plate: string; odometer: number; reason: string }[];
  duplicate_plates: string[];
  missing: { plate: string | null; model: string }[];
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10).split("-").reverse().join("/");
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diff = Math.floor((now.getTime() - then.getTime()) / 86400000);
  return diff < 0 ? 0 : diff;
}

const EMPTY_UPDATE_FORM = {
  odometer: "",
  reading_date: new Date().toISOString().slice(0, 10),
  source: "manual" as OdometerSource,
  notes: "",
};

export default function OdometerManager({ canEdit }: { canEdit: boolean }) {
  const [vehicles, setVehicles] = useState<FleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [situacaoFilter, setSituacaoFilter] = useState<"" | OdometerFreshness>("");
  const [showFilters, setShowFilters] = useState(false);

  const [updateVehicle, setUpdateVehicle] = useState<FleetRow | null>(null);
  const [updateForm, setUpdateForm] = useState(EMPTY_UPDATE_FORM);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateConflict, setUpdateConflict] = useState<{
    last_odometer: number;
    last_reading_date: string;
    difference: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const [historyVehicle, setHistoryVehicle] = useState<FleetRow | null>(null);
  const [historyReadings, setHistoryReadings] = useState<OdometerReading[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function loadVehicles() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/odometer");
      if (!res.ok) throw new Error("Falha ao carregar hodometro da frota.");
      const data = (await res.json()) as { vehicles: FleetRow[] };
      setVehicles(data.vehicles);
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

  const rows = useMemo(() => {
    return vehicles.map((v) => {
      const days = daysSince(v.last_reading_date);
      const freshness = computeFreshness(days);
      const deltaKm =
        v.last_odometer !== null && v.prev_odometer !== null
          ? v.last_odometer - v.prev_odometer
          : null;
      return { ...v, days, freshness, deltaKm };
    });
  }, [vehicles]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (situacaoFilter && r.freshness !== situacaoFilter) return false;
      if (!q) return true;
      return (
        r.plate?.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        r.responsible?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, situacaoFilter]);

  const summary = useMemo(() => {
    const total = rows.length;
    const atualizado = rows.filter((r) => r.freshness === "atualizado").length;
    const atencao = rows.filter((r) => r.freshness === "atencao").length;
    const desatualizado = rows.filter((r) => r.freshness === "desatualizado").length;
    const semRegistro = rows.filter((r) => r.freshness === "sem_registro").length;
    const deltas = rows.map((r) => r.deltaKm).filter((d): d is number => d !== null && d >= 0);
    const kmTotalMes = deltas.reduce((a, b) => a + b, 0);
    const mediaKm = deltas.length > 0 ? Math.round(kmTotalMes / deltas.length) : null;
    const maiorKm = deltas.length > 0 ? Math.max(...deltas) : null;
    const menorKm = deltas.length > 0 ? Math.min(...deltas) : null;
    const datas = rows.map((r) => r.last_reading_date).filter((d): d is string => !!d);
    const ultimaAtualizacao = datas.length > 0 ? datas.sort().reverse()[0] : null;
    return { total, atualizado, atencao, desatualizado, semRegistro, kmTotalMes, mediaKm, maiorKm, menorKm, ultimaAtualizacao };
  }, [rows]);

  function openUpdate(v: FleetRow) {
    setUpdateVehicle(v);
    setUpdateForm(EMPTY_UPDATE_FORM);
    setUpdateError(null);
    setUpdateConflict(null);
  }

  async function submitUpdate(e: React.FormEvent, override = false) {
    e.preventDefault();
    if (!updateVehicle) return;
    setSaving(true);
    setUpdateError(null);
    try {
      const res = await fetch("/api/odometer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: updateVehicle.id,
          odometer: updateForm.odometer,
          reading_date: updateForm.reading_date,
          source: updateForm.source,
          notes: updateForm.notes,
          override,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && !override) {
        setUpdateConflict({
          last_odometer: data.last_odometer,
          last_reading_date: data.last_reading_date,
          difference: data.difference,
        });
        setUpdateError(data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar leitura.");
      setUpdateVehicle(null);
      await loadVehicles();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(v: FleetRow) {
    setHistoryVehicle(v);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/odometer/${v.id}`);
      const data = await res.json();
      setHistoryReadings(data.readings ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }

  function parseCsv(text: string): { plate: string; odometer: number; reading_date: string }[] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.toLowerCase().startsWith("placa"))
      .map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        const [plate, odometer, reading_date] = parts;
        return { plate, odometer: Number(odometer), reading_date };
      });
  }

  async function submitImport() {
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const rows = parseCsv(importText);
      if (rows.length === 0) {
        throw new Error("Nenhuma linha valida encontrada. Formato: placa,hodometro,data (AAAA-MM-DD).");
      }
      const res = await fetch("/api/odometer/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, source: "importacao" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao importar.");
      setImportResult(data);
      await loadVehicles();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total de frota" value={String(summary.total)} />
        <StatCard label="Atualizado" value={String(summary.atualizado)} tone="accent" />
        <StatCard label="Atencao" value={String(summary.atencao)} tone="warn" />
        <StatCard label="Desatualizado" value={String(summary.desatualizado)} tone="crit" />
        <StatCard label="Sem registro" value={String(summary.semRegistro)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="KM total no periodo"
          value={summary.kmTotalMes.toLocaleString("pt-BR")}
          hint="Soma das variacoes entre as 2 ultimas leituras validas de cada veiculo"
        />
        <StatCard
          label="Media de KM por veiculo"
          value={summary.mediaKm !== null ? summary.mediaKm.toLocaleString("pt-BR") : "-"}
        />
        <StatCard
          label="Maior quilometragem"
          value={summary.maiorKm !== null ? summary.maiorKm.toLocaleString("pt-BR") : "-"}
        />
        <StatCard
          label="Menor quilometragem"
          value={summary.menorKm !== null ? summary.menorKm.toLocaleString("pt-BR") : "-"}
        />
        <StatCard label="Ultima atualizacao" value={formatDate(summary.ultimaAtualizacao)} />
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por placa, modelo, responsavel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-72"
          />
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="btn btn-secondary"
          >
            {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>
        {canEdit && (
          <button onClick={() => setShowImport(true)} className="btn btn-primary">
            Importar atualizacao de hodometro
          </button>
        )}
      </div>

      {showFilters && (
        <div className="card p-3 flex flex-wrap gap-2">
          {(["atualizado", "atencao", "desatualizado", "sem_registro"] as OdometerFreshness[]).map(
            (f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSituacaoFilter(situacaoFilter === f ? "" : f)}
                className={`tab-pill${situacaoFilter === f ? " tab-pill-active" : ""}`}
              >
                {ODOMETER_FRESHNESS_LABEL[f]}
              </button>
            )
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="text-xs" style={{ color: "var(--text-faint)" }}>
        {filteredRows.length} veiculo(s) nesta visualizacao
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Modelo</th>
              <th>Responsavel</th>
              <th>Hod. anterior</th>
              <th>Hod. atual</th>
              <th>KM no periodo</th>
              <th>Ultima atualizacao</th>
              <th>Dias</th>
              <th>Situacao</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="text-center" style={{ color: "var(--text-faint)" }}>
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center" style={{ color: "var(--text-faint)" }}>
                  Nenhum veiculo encontrado.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id}>
                <td className="mono font-medium whitespace-nowrap">{r.plate ?? "-"}</td>
                <td>{r.model}</td>
                <td style={{ color: "var(--text-dim)" }}>{r.responsible ?? "-"}</td>
                <td className="num">
                  {r.prev_odometer !== null ? `${r.prev_odometer.toLocaleString("pt-BR")} km` : "-"}
                </td>
                <td className="num font-medium">
                  {r.last_odometer !== null ? `${r.last_odometer.toLocaleString("pt-BR")} km` : "-"}
                </td>
                <td className="num">
                  {r.deltaKm !== null ? (
                    `${r.deltaKm.toLocaleString("pt-BR")} km`
                  ) : (
                    <span style={{ color: "var(--text-faint)" }}>Sem base anterior</span>
                  )}
                </td>
                <td className="mono whitespace-nowrap">{formatDate(r.last_reading_date)}</td>
                <td className="num">{r.days ?? "-"}</td>
                <td>
                  <Badge tone={ODOMETER_FRESHNESS_TONE[r.freshness]}>
                    {ODOMETER_FRESHNESS_LABEL[r.freshness]}
                  </Badge>
                </td>
                <td className="text-right whitespace-nowrap">
                  <button onClick={() => openHistory(r)} className="btn btn-ghost">
                    Historico
                  </button>
                  {canEdit && (
                    <button onClick={() => openUpdate(r)} className="btn btn-secondary">
                      Atualizar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {updateVehicle && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(20, 24, 31, 0.45)" }}
        >
          <form
            onSubmit={(e) => submitUpdate(e, false)}
            className="card w-full max-w-md p-6 flex flex-col gap-4"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-md)" }}
          >
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                Atualizar hodometro
              </h2>
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                {updateVehicle.plate} · {updateVehicle.model}
              </p>
            </div>

            {updateError && (
              <div className="alert alert-error flex flex-col gap-2">
                <span>{updateError}</span>
                {updateConflict && (
                  <span className="text-xs">
                    Ultimo registro: {updateConflict.last_odometer.toLocaleString("pt-BR")} km em{" "}
                    {formatDate(updateConflict.last_reading_date)} (diferenca de{" "}
                    {updateConflict.difference.toLocaleString("pt-BR")} km).
                  </span>
                )}
              </div>
            )}

            <label className="field-label">
              Hodometro (km) *
              <input
                type="number"
                min={1}
                required
                className="input"
                value={updateForm.odometer}
                onChange={(e) => setUpdateForm({ ...updateForm, odometer: e.target.value })}
              />
            </label>
            <label className="field-label">
              Data de referencia *
              <input
                type="date"
                required
                className="input"
                value={updateForm.reading_date}
                onChange={(e) => setUpdateForm({ ...updateForm, reading_date: e.target.value })}
              />
            </label>
            <label className="field-label">
              Origem
              <select
                className="input"
                value={updateForm.source}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, source: e.target.value as OdometerSource })
                }
              >
                {ODOMETER_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {ODOMETER_SOURCE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Observacao
              <textarea
                className="input"
                rows={2}
                value={updateForm.notes}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                placeholder="Obrigatoria se o KM for igual ao ultimo registro ou menor (com aprovacao)"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
              <button type="button" onClick={() => setUpdateVehicle(null)} className="btn btn-secondary">
                Cancelar
              </button>
              {updateConflict && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => submitUpdate(e, true)}
                  className="btn btn-danger-ghost"
                  style={{ borderColor: "var(--crit)" }}
                >
                  Aprovar mesmo assim
                </button>
              )}
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {historyVehicle && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(20, 24, 31, 0.45)" }}
        >
          <div
            className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-4"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  Historico de hodometro
                </h2>
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                  {historyVehicle.plate} · {historyVehicle.model}
                </p>
              </div>
              <button onClick={() => setHistoryVehicle(null)} className="btn btn-secondary">
                Fechar
              </button>
            </div>

            {historyLoading && (
              <div className="text-sm" style={{ color: "var(--text-faint)" }}>
                Carregando...
              </div>
            )}
            {!historyLoading && historyReadings.length === 0 && (
              <div className="text-sm" style={{ color: "var(--text-faint)" }}>
                Nenhum registro de hodometro para este veiculo ainda.
              </div>
            )}
            {!historyLoading && historyReadings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hodometro</th>
                      <th>Variacao</th>
                      <th>Origem</th>
                      <th>Responsavel</th>
                      <th>Status</th>
                      <th>Observacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyReadings.map((r) => (
                      <tr key={r.id}>
                        <td className="mono whitespace-nowrap">{formatDate(r.reading_date)}</td>
                        <td className="num">{r.odometer.toLocaleString("pt-BR")} km</td>
                        <td className="num">
                          {r.delta_km !== null ? `${r.delta_km.toLocaleString("pt-BR")} km` : "-"}
                        </td>
                        <td>{ODOMETER_SOURCE_LABEL[r.source]}</td>
                        <td style={{ color: "var(--text-dim)" }}>{r.recorded_by ?? "-"}</td>
                        <td>
                          <Badge tone={r.status === "valido" ? "ok" : "neutral"}>
                            {r.status === "valido" ? "Valido" : "Invalidado"}
                          </Badge>
                        </td>
                        <td style={{ color: "var(--text-dim)" }}>{r.notes ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(20, 24, 31, 0.45)" }}
        >
          <div
            className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-4"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  Importar atualizacao de hodometro
                </h2>
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                  Cole os dados no formato CSV: placa,hodometro,data (AAAA-MM-DD). Uma linha por veiculo.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportResult(null);
                  setImportText("");
                }}
                className="btn btn-secondary"
              >
                Fechar
              </button>
            </div>

            {importError && <div className="alert alert-error">{importError}</div>}

            {!importResult && (
              <>
                <textarea
                  className="input"
                  rows={10}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"AXE9H45,219697,2026-07-16\nDDD1H79,286654,2026-07-18"}
                  style={{ fontFamily: "var(--mono)" }}
                />
                <div className="flex justify-end">
                  <button
                    onClick={submitImport}
                    disabled={importing || !importText.trim()}
                    className="btn btn-primary"
                  >
                    {importing ? "Importando..." : "Importar"}
                  </button>
                </div>
              </>
            )}

            {importResult && (
              <div className="flex flex-col gap-3">
                <div
                  className="alert"
                  style={{
                    background:
                      importResult.missing.length > 0 ? "var(--warn-bg)" : "var(--ok-bg)",
                    color: importResult.missing.length > 0 ? "var(--warn)" : "var(--ok)",
                  }}
                >
                  {importResult.missing.length > 0
                    ? `Importacao concluida com pendencia. Foram encontrados ${
                        importResult.fleet_total - importResult.missing.length
                      } dos ${importResult.fleet_total} veiculos de frota. Existe(m) ${
                        importResult.missing.length
                      } veiculo(s) sem informacao de hodometro.`
                    : `Importacao concluida. Todos os ${importResult.fleet_total} veiculos de frota foram atualizados.`}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Linhas recebidas" value={String(importResult.rows_received)} />
                  <StatCard label="Registros importados" value={String(importResult.imported)} />
                </div>

                {importResult.missing.length > 0 && (
                  <div>
                    <div className="section-label mb-1">Veiculos de frota sem hodometro</div>
                    <ul className="text-sm flex flex-col gap-1">
                      {importResult.missing.map((m, i) => (
                        <li key={i}>
                          <span className="mono font-medium">{m.plate ?? "-"}</span> — {m.model}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.not_found.length > 0 && (
                  <div>
                    <div className="section-label mb-1">Placas da planilha nao encontradas</div>
                    <ul className="text-sm flex flex-col gap-1">
                      {importResult.not_found.map((n, i) => (
                        <li key={i}>
                          <span className="mono font-medium">{n.plate}</span> —{" "}
                          {n.odometer.toLocaleString("pt-BR")} km
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.rejected.length > 0 && (
                  <div>
                    <div className="section-label mb-1">Registros rejeitados</div>
                    <ul className="text-sm flex flex-col gap-1">
                      {importResult.rejected.map((r, i) => (
                        <li key={i}>
                          <span className="mono font-medium">{r.plate}</span> — {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.invalid.length > 0 && (
                  <div>
                    <div className="section-label mb-1">Linhas invalidas</div>
                    <ul className="text-sm flex flex-col gap-1">
                      {importResult.invalid.map((r, i) => (
                        <li key={i}>{r.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setImportResult(null);
                      setImportText("");
                    }}
                    className="btn btn-secondary"
                  >
                    Nova importacao
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
