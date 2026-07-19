export type BadgeTone = "ok" | "warn" | "crit" | "info" | "neutral" | "accent";

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
