import { NextResponse } from "next/server";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import type { Company, CompanyIntel, ImpactPlan } from "@/types";

export const runtime = "nodejs";

type GeminiOutreachDraft = {
  variant: string;
  subject_line: string;
  body: string;
};

function planSummary(plan: ImpactPlan) {
  const entries = Object.entries(plan.plan_data ?? {})
    .filter(([k]) => k.toLowerCase().startsWith("month_"))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 2)
    .map(([k, v]) => ({ month: k, objective: v.objective, key_results: v.key_results?.slice(0, 2) ?? [] }));
  return JSON.stringify(entries);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { company_id?: unknown };
    const companyId = typeof body.company_id === "string" ? body.company_id : null;
    if (!companyId) return NextResponse.json({ error: "Missing company_id" }, { status: 400 });

    const [{ data: companyData }, { data: intelData }, { data: planData }] = await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
      supabase
        .from("company_intel")
        .select("*")
        .eq("company_id", companyId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("impact_plans")
        .select("*")
        .eq("company_id", companyId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!companyData) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    if (!intelData || !planData) return NextResponse.json({ error: "Missing intel/plan" }, { status: 400 });

    const company = companyData as Company;
    const intel = intelData as CompanyIntel;
    const plan = planData as ImpactPlan;

    const prompt = [
      `Draft cold outreach for ${company.name}.`,
      `Context: ${intel.summary}.`,
      `Proposed plan summary: ${planSummary(plan)}.`,
      `Return ONLY valid JSON (no markdown, no code fences) as an array of 3 objects:`,
      `[{variant: string, subject_line: string, body: string}]`,
      `Variant 1: Short founder email.`,
      `Variant 2: Metrics-focused hiring manager email.`,
      `Variant 3: Soft LinkedIn intro.`,
    ].join("\n");

    const raw = await callGemini(prompt);
    const drafts = parseGeminiJson<GeminiOutreachDraft[]>(raw).slice(0, 3);

    const insertRows = drafts.map((d) => ({
      company_id: companyId,
      variant: d.variant,
      subject_line: d.subject_line,
      body: d.body,
    }));

    const { error: insertError } = await supabase.from("outreach_drafts").insert(insertRows);
    if (insertError) throw new Error(insertError.message);

    await supabase.from("companies").update({ status: "outreach_ready" }).eq("id", companyId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to generate. Try again." }, { status: 500 });
  }
}
