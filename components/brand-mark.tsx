// Marca provisoria (letra "S"). Assim que as logos reais (Zanatta / Van der
// Hoeven) forem enviadas como arquivo de imagem, troque o <span> abaixo por
// <img src="/logo-zanatta.svg" ... /> (e o mesmo para o mark menor).

export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "w-7 h-7 text-sm" : "w-9 h-9 text-base";
  return (
    <span
      className={`flex items-center justify-center rounded-lg font-bold ${dimensions}`}
      style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
    >
      S
    </span>
  );
}

export function BrandLockup() {
  return (
    <div className="flex items-center gap-2.5 justify-center">
      <BrandMark size="md" />
      <div>
        <div className="text-lg font-semibold leading-none" style={{ color: "var(--ink)" }}>
          SIGF
        </div>
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
          Zanatta / Van der Hoeven
        </div>
      </div>
    </div>
  );
}
