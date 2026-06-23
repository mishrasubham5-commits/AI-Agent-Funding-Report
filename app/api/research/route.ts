import { NextResponse } from "next/server";

import { callGeminiWithRetry, parseGeminiJson } from "@/lib/gemini";
import { searchSerper } from "@/lib/serper";
import { supabase } from "@/lib/supabase";
import type { Company } from "@/types";

export const runtime = "nodejs";

type GeminiIntel = {
  summary: string;
  business_model: string;
  tam_estimate: string;
  competitors: string[];
  growth_priorities: string[];
  hiring_signals: string[];
};

function listToText(items: string[]) {
  const cleaned = items.map((s) => s.trim()).filter((s) => s.length > 0);
  return cleaned.length ? cleaned.join("\n") : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { company_id?: unknown };
    const companyId = typeof body.company_id === "string" ? body.company_id : null;
    if (!companyId) return NextResponse.json({ error: "Missing company_id" }, { status: 400 });

    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !companyData) throw new Error("Company not found");
    const company = companyData as Company;

    const [competitors, businessModel, jobs] = await Promise.all([
      searchSerper(`${company.name} competitors`),
      searchSerper(`${company.name} business model`),
      searchSerper(`${company.name} product manager jobs`),
    ]);

    const sources = [...competitors, ...businessModel, ...jobs].slice(0, 20);

    const prompt = [
      `You are a VC analyst. Analyze ${company.name}.`,
      `Funding: ${company.funding_amount ?? "unknown"}.`,
      `Search results: ${JSON.stringify(sources)}.`,
      `Return ONLY valid JSON (no markdown, no code fences) with keys:`,
      `summary, business_model, tam_estimate, competitors (array of strings), growth_priorities (array of strings), hiring_signals (array of strings).`,
    ].join("\n");

    const raw = await callGeminiWithRetry(prompt);
    const intel = parseGeminiJson<GeminiIntel>(raw);

    const { error: insertError } = await supabase.from("company_intel").insert({
      company_id: companyId,
      summary: intel.summary,
      business_model: intel.business_model,
      tam_estimate: intel.tam_estimate,
      competitors: intel.competitors,
      growth_priorities: listToText(intel.growth_priorities),
      hiring_signals: listToText(intel.hiring_signals),
    });

    if (insertError) throw new Error(insertError.message);

    await supabase.from("companies").update({ status: "researched" }).eq("id", companyId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Research API error:", detail);
    if (stack) {
      console.error(stack);
    }
    return NextResponse.json(
      {
        error: detail,
        ...(stack ? { stack } : {}),
      },
      { status: 500 },
    );
  }
}
