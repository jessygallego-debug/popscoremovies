// Server callers only. No privileged credentials or database access enter client bundles.
export async function releaseRest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Release database server configuration is missing.");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(`Release database request failed (${response.status}).`);
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}
export function upsertReleaseRows(
  table: string,
  rows: unknown[],
  conflict: string,
) {
  if (!rows.length) return Promise.resolve(null);
  return releaseRest(`${table}?on_conflict=${conflict}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(rows),
  });
}
