import type { SerperOrganicResult } from "@/types";
import { normalizeEnvValue } from "@/lib/utils";

interface SerperOrganicItem {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
}

interface SerperResponse {
  organic?: SerperOrganicItem[] | null;
  message?: string;
  error?: string;
}

export async function searchSerper(query: string): Promise<SerperOrganicResult[]> {
  const apiKey = normalizeEnvValue(process.env.SERPER_API_KEY);
  if (!apiKey) throw new Error("Missing SERPER_API_KEY");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`Serper request failed (${res.status}): ${bodyText || "Unknown error"}`);
  }

  const data = (await res.json()) as SerperResponse;
  if (data.error || data.message) {
    throw new Error(`Serper request failed: ${data.error ?? data.message}`);
  }

  const items = Array.isArray(data?.organic) ? data.organic : [];

  if (data.organic != null && !Array.isArray(data.organic)) {
    throw new Error("Serper response is invalid: expected organic to be an array.");
  }

  return items
    .map((r, idx) => ({
      title: r.title ?? "",
      link: r.link ?? "",
      snippet: r.snippet ?? "",
      position: r.position ?? idx + 1,
    }))
    .filter((r) => r.title.length > 0 && r.link.length > 0);
}
