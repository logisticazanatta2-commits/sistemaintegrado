export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const height = size === "sm" ? 26 : 34;
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/logo-zanatta.png"
        alt="Zanatta Estufas Agricolas"
        style={{ height, width: "auto" }}
      />
      <span style={{ width: 1, height: height * 0.75, background: "var(--line-strong)" }} />
      <img
        src="/logo-vdh.png"
        alt="Van der Hoeven Estufas Agricolas"
        style={{ height, width: "auto" }}
      />
    </div>
  );
}

export function BrandLockup() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <img src="/logo-zanatta.png" alt="Zanatta Estufas Agricolas" style={{ height: 42, width: "auto" }} />
        <span style={{ width: 1, height: 30, background: "var(--line-strong)" }} />
        <img src="/logo-vdh.png" alt="Van der Hoeven Estufas Agricolas" style={{ height: 42, width: "auto" }} />
      </div>
      <div className="text-center">
        <div className="text-base font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
          SIGF
        </div>
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
          Sistema Integrado de Gestao de Frotas
        </div>
      </div>
    </div>
  );
}
