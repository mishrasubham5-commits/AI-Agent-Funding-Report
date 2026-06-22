import { NextResponse } from "next/server";

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

import { supabase } from "@/lib/supabase";
import type { Company, CompanyIntel, ImpactPlan, OutreachDraft } from "@/types";

export const runtime = "nodejs";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function resolveExecutablePath() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && envPath.length > 0 && existsSync(envPath)) return envPath;

  if (process.platform === "win32") {
    const candidates = [
      "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
      "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
      "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
      "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
    ];
    const found = candidates.find((p) => existsSync(p));
    if (found) return found;
  }

  const chromiumPath = await chromium.executablePath();
  if (chromiumPath && chromiumPath.length > 0 && existsSync(chromiumPath)) return chromiumPath;

  return undefined;
}

function formatFundingAmount(value: string | null) {
  if (!value) return "—";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(numeric);
  }
  return value;
}

function buildHtml(input: {
  company: Company;
  intel: CompanyIntel | null;
  plan: ImpactPlan | null;
  drafts: OutreachDraft[];
}) {
  const { company, intel, plan, drafts } = input;

  const planBlocks = plan
    ? Object.entries(plan.plan_data ?? {})
        .filter(([k]) => k.toLowerCase().startsWith("month_"))
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 6)
        .map(([k, v]) => {
          const krs = (v.key_results ?? []).slice(0, 3).map((kr) => `<li>${escapeHtml(kr)}</li>`).join("");
          const inits = (v.initiatives ?? []).slice(0, 5).map((it) => `<li>${escapeHtml(it)}</li>`).join("");
          return `
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:12px;">
              <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:6px;">${escapeHtml(
                k.replace("_", " ").replace(/month/i, "Month"),
              )}</div>
              <div style="margin-bottom:10px;">
                <div style="font-size:12px;color:#475569;font-weight:600;margin-bottom:4px;">Objective</div>
                <div style="font-size:13px;line-height:1.55;color:#0f172a;">${escapeHtml(v.objective)}</div>
              </div>
              <div style="display:flex;gap:18px;">
                <div style="flex:1;">
                  <div style="font-size:12px;color:#475569;font-weight:600;margin-bottom:4px;">Key Results</div>
                  <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.55;color:#0f172a;">${krs}</ul>
                </div>
                <div style="flex:1;">
                  <div style="font-size:12px;color:#475569;font-weight:600;margin-bottom:4px;">Initiatives</div>
                  <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.55;color:#0f172a;">${inits}</ul>
                </div>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div style="color:#475569;font-size:13px;">No plan generated.</div>`;

  const outreachBlocks =
    drafts.length > 0
      ? drafts.slice(0, 3).map((d) => {
          return `
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:12px;">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
                <div style="font-weight:700;font-size:14px;color:#0f172a;">${escapeHtml(d.variant)}</div>
                <div style="font-size:12px;color:#64748b;">Subject: ${escapeHtml(d.subject_line)}</div>
              </div>
              <pre style="white-space:pre-wrap;margin-top:10px;font-size:12.5px;line-height:1.6;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(
                d.body,
              )}</pre>
            </div>
          `;
        })
      : [`<div style="color:#475569;font-size:13px;">No outreach drafts generated.</div>`];

  const competitors =
    intel?.competitors?.length ? intel.competitors.map((c) => `<span style="display:inline-block;border:1px solid #e2e8f0;border-radius:999px;padding:4px 10px;margin:4px 6px 0 0;font-size:12px;color:#0f172a;">${escapeHtml(c)}</span>`).join("") : "—";

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(company.name)} — PM Package</title>
    </head>
    <body style="margin:0;padding:40px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a;background:#ffffff;">
      <div style="max-width:900px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
          <div>
            <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;">${escapeHtml(company.name)}</div>
            <div style="margin-top:6px;font-size:13px;color:#475569;">
              Funding: <span style="font-weight:700;color:#0f172a;">${escapeHtml(formatFundingAmount(company.funding_amount))}</span>
              ${company.funding_round ? ` • Round: <span style="font-weight:700;color:#0f172a;">${escapeHtml(company.funding_round)}</span>` : ""}
              ${company.funding_date ? ` • Date: <span style="font-weight:700;color:#0f172a;">${escapeHtml(company.funding_date)}</span>` : ""}
            </div>
            ${
              company.website
                ? `<div style="margin-top:8px;font-size:13px;color:#475569;">Website: <a href="${escapeHtml(
                    company.website,
                  )}" style="color:#2563eb;text-decoration:none;">${escapeHtml(company.website)}</a></div>`
                : ""
            }
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;min-width:220px;">
            <div style="font-size:12px;color:#64748b;font-weight:600;">Package</div>
            <div style="margin-top:6px;font-size:13px;color:#0f172a;line-height:1.6;">
              Research • 6-Month Plan • Outreach
            </div>
          </div>
        </div>

        <div style="margin-top:22px;border-top:1px solid #e2e8f0;"></div>

        <div style="margin-top:22px;">
          <div style="font-size:16px;font-weight:800;margin-bottom:10px;">1) Market Research</div>
          ${
            intel
              ? `
              <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
                <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:6px;">Summary</div>
                <div style="font-size:13px;line-height:1.7;">${escapeHtml(intel.summary)}</div>
                <div style="margin-top:12px;display:flex;gap:18px;">
                  <div style="flex:1;">
                    <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:6px;">Business model</div>
                    <div style="font-size:13px;line-height:1.7;">${escapeHtml(intel.business_model)}</div>
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:6px;">TAM estimate</div>
                    <div style="font-size:13px;line-height:1.7;">${escapeHtml(intel.tam_estimate)}</div>
                  </div>
                </div>
                <div style="margin-top:12px;">
                  <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:6px;">Competitors</div>
                  <div>${competitors}</div>
                </div>
              </div>
              `
              : `<div style="color:#475569;font-size:13px;">No research generated.</div>`
          }
        </div>

        <div style="margin-top:22px;">
          <div style="font-size:16px;font-weight:800;margin-bottom:10px;">2) 6-Month Impact Plan</div>
          ${planBlocks}
        </div>

        <div style="margin-top:22px;">
          <div style="font-size:16px;font-weight:800;margin-bottom:10px;">3) Outreach Drafts</div>
          ${Array.isArray(outreachBlocks) ? outreachBlocks.join("") : outreachBlocks}
        </div>

        <div style="margin-top:26px;border-top:1px solid #e2e8f0;padding-top:14px;font-size:11px;color:#64748b;">
          Generated by AI Job Search Copilot • ${escapeHtml(new Date().toISOString())}
        </div>
      </div>
    </body>
  </html>`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { company_id?: unknown };
    const companyId = typeof body.company_id === "string" ? body.company_id : null;
    if (!companyId) return NextResponse.json({ error: "Missing company_id" }, { status: 400 });

    const [{ data: companyData }, { data: intelData }, { data: planData }, { data: draftsData }] = await Promise.all([
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
      supabase
        .from("outreach_drafts")
        .select("*")
        .eq("company_id", companyId)
        .order("generated_at", { ascending: false }),
    ]);

    if (!companyData) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const html = buildHtml({
      company: companyData as Company,
      intel: (intelData ?? null) as CompanyIntel | null,
      plan: (planData ?? null) as ImpactPlan | null,
      drafts: (draftsData ?? []) as OutreachDraft[],
    });

    const executablePath = await resolveExecutablePath();
    if (!executablePath) {
      throw new Error("No Chrome executable found. Install Chrome/Edge or set PUPPETEER_EXECUTABLE_PATH.");
    }

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 1600 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" } });
    await page.close();
    await browser.close();

    const filePath = `company_${companyId}/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(filePath, Buffer.from(pdfBuffer), { contentType: "application/pdf", upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage.from("reports").getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    await supabase.from("reports").insert({ company_id: companyId, pdf_url: publicUrl });
    await supabase.from("companies").update({ status: "report_ready" }).eq("id", companyId);

    return NextResponse.json({ url: publicUrl });
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
