export interface InfractionCatalogEntry {
  code: string;
  description: string;
  points: number;
  base_amount_cents: number | null;
  source: string;
}

/**
 * Tenta achar o codigo (ou uma variacao proxima) no catalogo.
 * Cobre pequenas diferencas de notacao do desdobramento (ex: "7455-0" vs
 * "7455", ou so o codigo-base quando o desdobramento exato ainda nao
 * apareceu no catalogo).
 */
export function lookupInfractionCatalog(
  rawCode: string,
  catalog: InfractionCatalogEntry[]
): InfractionCatalogEntry | null {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const byCode = new Map(catalog.map((e) => [e.code.toUpperCase(), e]));

  if (byCode.has(code)) return byCode.get(code)!;

  // "7455" <-> "7455-0"
  if (byCode.has(`${code}-0`)) return byCode.get(`${code}-0`)!;
  if (code.endsWith("-0") && byCode.has(code.slice(0, -2))) {
    return byCode.get(code.slice(0, -2))!;
  }

  // Ultimo recurso: mesmo codigo-base, qualquer desdobramento
  const base = code.split("-")[0];
  const sameFamily = catalog.find((e) => e.code.split("-")[0].toUpperCase() === base);
  return sameFamily ?? null;
}
