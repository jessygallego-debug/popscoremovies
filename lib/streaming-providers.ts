export type StreamingProvider = {
  provider_id: number;
  provider_name: string;
  provider_ids?: number[];
};

function serviceName(name: string) {
  const cleaned = name
    .replace(/\s+(?:Amazon|Apple TV|Roku(?: Premium)?)\s+Channels?$/i, "")
    .replace(/\s*\((?:Amazon|Apple TV|Roku)\)\s*$/i, "")
    .replace(/\s*\((?:standard|basic)?\s*with ads\)\s*$/i, "")
    .replace(/\s+(?:standard|basic)?\s*with ads\s*$/i, "")
    .trim();
  const aliases: Record<string, string> = {
    "paramount plus": "Paramount+", "paramount+": "Paramount+",
    "apple tv+": "Apple TV", "apple tv plus": "Apple TV",
    "amazon prime video": "Prime Video", "prime video": "Prime Video",
  };
  return aliases[cleaned.toLowerCase()] ?? cleaned;
}

// Keep all country-specific IDs so one selection searches every delivery channel.
export function groupStreamingProviders(providers: StreamingProvider[]) {
  const groups = new Map<string, StreamingProvider>();
  for (const provider of providers) {
    const name = serviceName(provider.provider_name);
    const key = name.toLowerCase();
    const existing = groups.get(key);
    const ids = provider.provider_ids ?? [provider.provider_id];
    if (existing) {
      existing.provider_ids = [...new Set([...(existing.provider_ids ?? []), ...ids])];
      if (provider.provider_name === name) existing.provider_id = provider.provider_id;
    } else {
      groups.set(key, { provider_id: provider.provider_id, provider_name: name, provider_ids: [...ids] });
    }
  }
  return [...groups.values()].sort((a, b) => a.provider_name.localeCompare(b.provider_name, "en", { sensitivity: "base" }));
}
