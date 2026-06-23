import { NextResponse } from "next/server";

import { callGeminiWithRetry, parseGeminiJson } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import type { Company, CompanyIntel, ImpactPlanMonth } from "@/types";

export const runtime = "nodejs";

type GeminiPlan = Record<string, ImpactPlanMonth>;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { company_id?: unknown };
    const companyId = typeof body.company_id === "string" ? body.company_id : null;
    if (!companyId) return NextResponse.json({ error: "Missing company_id" }, { status: 400 });

    const [{ data: companyData }, { data: intelData }] = await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
      supabase
        .from("company_intel")
        .select("*")
        .eq("company_id", companyId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!companyData) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    if (!intelData) {
      return NextResponse.json(
        { error: "Research not found. Please generate research first." },
        { status: 400 },
      );
    }

    const company = companyData as Company;
    const intel = intelData as CompanyIntel;

    const prompt = [
      `You are a PM who joined ${company.name}.`,
      `Funding: ${company.funding_amount ?? "unknown"}.`,
      `Business: ${intel.summary}.`,
      `Growth priorities: ${intel.growth_priorities ?? "unknown"}.`,
      `Create a 6-month OKR plan.`,
      `Return ONLY valid JSON (no markdown, no code fences) with keys month_1..month_6. Each month is an object: {objective: string, key_results: string[], initiatives: string[]}.`,
    ].join("\n");

    const raw = await callGeminiWithRetry(prompt);
    const months = parseGeminiJson<GeminiPlan>(raw);

    const { error: insertError } = await supabase.from("impact_plans").insert({
      company_id: companyId,
      plan_data: months,
    });

    if (insertError) throw new Error(insertError.message);
    await supabase.from("companies").update({ status: "planned" }).eq("id", companyId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Plan API error:", detail);
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
