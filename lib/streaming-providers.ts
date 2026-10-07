export type StreamingProvider = {
  provider_id: number;
  provider_name: string;
  provider_ids?: number[];
};

function serviceName(name: string) {
  let cleaned = name.trim();
  // Some provider names put an ad-plan suffix after the channel suffix.
  for (let pass = 0; pass < 3; pass++) {
    cleaned = cleaned
      .replace(/\s*\((?:standard|basic)?\s*with ads\)\s*$/i, "")
      .replace(/\s+(?:standard|basic)?\s*with ads\s*$/i, "")
      .replace(/\s*\((?:Amazon|Apple TV|Roku)\)\s*$/i, "")
      .replace(/^(.+?)\s+(?:Amazon|Amzon|Apple TV|Roku(?: Premium)?)\s+Channels?$/i,
        (original, prefix: string) => prefix.toLowerCase() === "the" ? original : prefix)
      .trim();
  }
  const aliases: Record<string, string> = {
    acorntv: "Acorn TV", ae: "A&E", aecrimecentral: "A&E",
    amc: "AMC", amcplus: "AMC",
    amazonvideo: "Prime Video", amazonprimevideo: "Prime Video",
    amazonprimevideofree: "Prime Video", primevideo: "Prime Video",
    appletv: "Apple TV", appletvplus: "Apple TV", appletvstore: "Apple TV",
    paramountplus: "Paramount+", paramountplusessential: "Paramount+",
    paramountpluspremium: "Paramount+",
    broadwayhd: "BroadwayHD", curiositystream: "Curiosity Stream",
    discoveryplus: "Discovery+", mgmplus: "MGM+",
    peacock: "Peacock", peacockpremium: "Peacock", peacockpremiumplus: "Peacock",
    netflix: "Netflix", netflixkids: "Netflix",
    plex: "Plex", plexchannel: "Plex", mhzchoice: "MHz Choice", mzchoice: "MHz Choice",
    pureflix: "Pure Flix", greatamericanpureflix: "Pure Flix",
    shoutfactory: "Shout! Factory TV", shoutfactorytv: "Shout! Factory TV",
    vix: "ViX", vixpremium: "ViX",
    youtube: "YouTube", youtubefree: "YouTube",
  };
  const key = cleaned.toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");
  return aliases[key] ?? cleaned;
}
const PURCHASE_STOREFRONTS = new Set([
  "amazonvideo", "appletvstore", "itunes", "googleplaymovies",
  "googleplaymoviesandtv", "googleplay", "youtube", "microsoftstore",
  "fandango", "fandangoathome", "vudu",
  "rakutentv", "chili", "cineplex", "cinemastore", "skystore",
  "telstratv", "telstratvboxoffice", "fetchtv",
]);

function isPurchaseStorefront(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return PURCHASE_STOREFRONTS.has(normalized) || /store$/i.test(name.trim());
}

// Keep all country-specific IDs so one selection searches every delivery channel.
export function groupStreamingProviders(providers: StreamingProvider[]) {
  const groups = new Map<string, StreamingProvider>();
  for (const provider of providers) {
    // Storefronts sell/rent individual titles and are not subscription catalogs.
    if (isPurchaseStorefront(provider.provider_name)) continue;
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
