"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportPdfButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setError(null);
    setUploading(false);
  }

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Somente arquivos PDF sao aceitos por enquanto.");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function startImport() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/manutencao/importar-pdf", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar o documento.");
      setOpen(false);
      reset();
      router.push(`/manutencao/importar/${data.import_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setUploading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-secondary">
        Importar orcamento ou OS em PDF
      </button>

      {open && (
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
                Importar orcamento ou OS em PDF
              </h2>
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                O documento sera lido automaticamente. Voce podera revisar e editar tudo antes de
                lancar no historico.
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files[0] ?? null);
                }}
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-8 rounded-md cursor-pointer text-center"
                style={{
                  border: `2px dashed ${dragOver ? "var(--accent)" : "var(--line-strong)"}`,
                  background: dragOver ? "var(--accent-bg)" : "var(--surface-2)",
                }}
              >
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  Arraste o PDF aqui ou clique para selecionar
                </span>
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  Somente arquivos .pdf, ate 20MB
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <div className="card p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                    {file.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {formatSize(file.size)}
                  </div>
                </div>
                {!uploading && (
                  <button type="button" onClick={() => setFile(null)} className="btn btn-ghost">
                    Remover
                  </button>
                )}
              </div>
            )}

            {uploading && (
              <div className="text-sm" style={{ color: "var(--text-dim)" }}>
                Lendo o documento com IA... isso pode levar alguns segundos.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                disabled={uploading}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={startImport}
                disabled={!file || uploading}
                className="btn btn-primary"
              >
                {uploading ? "Processando..." : "Iniciar leitura"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
