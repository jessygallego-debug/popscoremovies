type PublicProfileRow = {
  updated_at?: string | null;
  username: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
  };
}

async function supabaseFetch<T>(path: string): Promise<T> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export async function getPublicProfileUsernames(limit = 200) {
  try {
    return await supabaseFetch<PublicProfileRow[]>(
      `/profiles?select=username,updated_at&order=updated_at.desc&limit=${limit}`
    );
  } catch {
    return [];
  }
}

export async function getPublicProfileForSeo(username: string) {
  try {
    const rows = await supabaseFetch<PublicProfileRow[]>(
      `/profiles?username=eq.${encodeURIComponent(
        username
      )}&select=username,updated_at&limit=1`
    );

    return rows[0] ?? null;
  } catch {
    return null;
  }
}
