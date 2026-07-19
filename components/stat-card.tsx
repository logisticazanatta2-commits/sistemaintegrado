type StatTone = "ink" | "accent" | "warn" | "crit";

const TONE_COLOR: Record<StatTone, string> = {
  ink: "var(--ink)",
  accent: "var(--accent-hover)",
  warn: "var(--warn)",
  crit: "var(--crit)",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
}) {
  return (
    <div className="card p-5 flex flex-col gap-1.5">
      <div className="section-label">{label}</div>
      <div className="text-2xl font-semibold tracking-tight" style={{ color: TONE_COLOR[tone] }}>
        {value}
      </div>
      {hint && (
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}
