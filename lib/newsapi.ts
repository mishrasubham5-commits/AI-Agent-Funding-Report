import type { FundingDiscoveryItem } from "@/types";
import { normalizeEnvValue } from "@/lib/utils";

interface NewsApiArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
}

interface NewsApiResponse {
  status: "ok" | "error";
  articles?: NewsApiArticle[];
  message?: string;
}

function parseAmountUsd(text: string): number | null {
  const normalized = text.replaceAll(",", "");
  const moneyMatch =
    normalized.match(/\$?\s*(\d+(?:\.\d+)?)\s*(million|billion|m|bn|b)\b/i) ??
    normalized.match(/\b(\d+(?:\.\d+)?)\s*(million|billion)\s*usd\b/i);

  if (!moneyMatch) return null;

  const value = Number(moneyMatch[1]);
  if (!Number.isFinite(value)) return null;

  const unit = moneyMatch[2].toLowerCase();
  if (unit === "million" || unit === "m") return Math.round(value * 1_000_000);
  if (unit === "billion" || unit === "b" || unit === "bn") return Math.round(value * 1_000_000_000);
  return null;
}

function parseRound(text: string): string | null {
  const match = text.match(/\b(pre-seed|seed|angel|bridge|strategic|series\s+[a-f])\b/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, " ").replace(/^series\s+/i, "Series ").replace(/^seed$/i, "Seed");
}

function parseCompanyName(title: string): string | null {
  const cleaned = title.replace(/\s+/g, " ").trim();
  const match = cleaned.match(
    /^(.+?)\s+(raises|raised|secures|secured|closes|lands|announces|bags)\b/i,
  );
  const candidate = (match?.[1] ?? "").trim();
  if (!candidate) return null;
  const withoutQuotes = candidate.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
  const withoutSuffix = withoutQuotes.replace(/\s+(funding|round)$/i, "");
  const short = withoutSuffix.split(" - ")[0]?.trim() ?? withoutSuffix.trim();
  if (!short) return null;
  return short.slice(0, 120);
}

export async function fetchFundingNews(): Promise<FundingDiscoveryItem[]> {
  const apiKey = normalizeEnvValue(process.env.NEWSAPI_KEY);
  if (!apiKey) throw new Error("Missing NEWSAPI_KEY");

  const url = `https://newsapi.org/v2/everything?q=startup+funding+raised&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  const data = (await res.json()) as NewsApiResponse;

  if (!res.ok || data.status !== "ok" || !data.articles) {
    throw new Error(data.message ?? "NewsAPI request failed");
  }

  const results: FundingDiscoveryItem[] = [];

  for (const article of data.articles) {
    const combined = [article.title, article.description ?? ""].join(" ");
    const name = parseCompanyName(article.title);
    if (!name) continue;

    results.push({
      name,
      funding_amount: parseAmountUsd(combined),
      funding_round: parseRound(combined),
      funding_date: article.publishedAt,
      source_url: article.url,
      source_title: article.title,
    });
  }

  return results;
}
