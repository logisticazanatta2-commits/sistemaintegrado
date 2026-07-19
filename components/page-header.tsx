export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
        {title}
      </h1>
      <p className="text-sm mt-0.5" style={{ color: "var(--text-dim)" }}>
        {description}
      </p>
    </div>
  );
}
