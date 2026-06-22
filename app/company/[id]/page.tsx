"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { IntelPanel } from "@/components/intel-panel";
import { OutreachPanel } from "@/components/outreach-panel";
import { PlanTimeline } from "@/components/plan-timeline";
import { ReportGenerator } from "@/components/report-generator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import type { Company, CompanyIntel, ImpactPlan, OutreachDraft, Report } from "@/types";

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

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  const [company, setCompany] = React.useState<Company | null>(null);
  const [intel, setIntel] = React.useState<CompanyIntel | null>(null);
  const [plan, setPlan] = React.useState<ImpactPlan | null>(null);
  const [drafts, setDrafts] = React.useState<OutreachDraft[]>([]);
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [{ data: c }, { data: i }, { data: p }, { data: d }, { data: r }] = await Promise.all([
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
        supabase
          .from("reports")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setCompany((c ?? null) as Company | null);
      setIntel((i ?? null) as CompanyIntel | null);
      setPlan((p ?? null) as ImpactPlan | null);
      setDrafts(((d ?? []) as OutreachDraft[]) ?? []);
      setReport((r ?? null) as Report | null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  if (loading && !company) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <Skeleton className="h-8 w-64" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <div className="text-xl font-semibold">Company not found</div>
        <div className="mt-2 text-sm text-muted-foreground">Return to the dashboard and try again.</div>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            <Badge variant="secondary">{formatFundingAmount(company.funding_amount)}</Badge>
            {company.funding_round ? <Badge variant="outline">{company.funding_round}</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {company.website ? (
              <a className="underline underline-offset-4 hover:text-foreground" href={company.website} target="_blank" rel="noreferrer">
                {company.website}
              </a>
            ) : null}
          </div>
        </div>

        <ReportGenerator companyId={companyId} existingUrl={report?.pdf_url ?? null} onGenerated={refresh} />
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="research">Market Research</TabsTrigger>
          <TabsTrigger value="plan">6-Month Plan</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Funding Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div>
                  <div className="text-muted-foreground">Funding</div>
                  <div className="font-medium">{formatFundingAmount(company.funding_amount)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Round</div>
                  <div className="font-medium">{company.funding_round ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Date</div>
                  <div className="font-medium">{company.funding_date ?? "—"}</div>
                </div>
              </div>
              <div className="grid gap-1">
                <div className="text-muted-foreground">Status</div>
                <div className="font-medium">{company.status ?? "discovered"}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research">
          <IntelPanel company={company} intel={intel} onUpdated={refresh} />
        </TabsContent>

        <TabsContent value="plan">
          <PlanTimeline company={company} intel={intel} plan={plan} onUpdated={refresh} />
        </TabsContent>

        <TabsContent value="outreach">
          <OutreachPanel company={company} intel={intel} plan={plan} drafts={drafts} onUpdated={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
