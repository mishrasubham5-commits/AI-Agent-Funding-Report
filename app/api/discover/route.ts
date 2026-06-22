import { NextResponse } from "next/server";

import { fetchFundingNews } from "@/lib/newsapi";
import { supabase } from "@/lib/supabase";
import type { FundingDiscoveryItem } from "@/types";

export const runtime = "nodejs";

function toIsoDate(input: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const items = await fetchFundingNews();
    const names = Array.from(new Set(items.map((i) => i.name).filter((n) => n.length > 0)));

    if (names.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    const { data: existing } = await supabase.from("companies").select("name").in("name", names);
    const existingNames = new Set((existing ?? []).map((r) => String((r as { name: unknown }).name)));

    const toInsert = items
      .filter((i) => !existingNames.has(i.name))
      .map((i: FundingDiscoveryItem) => ({
        name: i.name,
        funding_amount: i.funding_amount == null ? null : String(i.funding_amount),
        funding_round: i.funding_round,
        funding_date: toIsoDate(i.funding_date),
        status: "discovered",
      }));

    if (toInsert.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    const { error } = await supabase.from("companies").insert(toInsert);
    if (error) throw new Error(error.message);

    return NextResponse.json({ inserted: toInsert.length });
  } catch (err) {
    const debug = req.headers.get("x-debug") === "1" && process.env.NODE_ENV !== "production";
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error(detail);
    return NextResponse.json(
      debug ? { error: "Failed to generate. Try again.", detail } : { error: "Failed to generate. Try again." },
      { status: 500 },
    );
  }
}
