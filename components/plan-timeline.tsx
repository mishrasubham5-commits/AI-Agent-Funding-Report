"use client";

import * as React from "react";

import type { Company, CompanyIntel, ImpactPlan, ImpactPlanMonth } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function monthIndex(key: string) {
  const match = key.match(/month_(\d+)/i);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]);
}

function firstN(list: string[], n: number) {
  return list.slice(0, n);
}

export function PlanTimeline({
  company,
  intel,
  plan,
  onUpdated,
}: {
  company: Company;
  intel: CompanyIntel | null;
  plan: ImpactPlan | null;
  onUpdated: () => Promise<void>;
}) {
  const [pending, start] = React.useTransition();

  const generate = () => {
    start(async () => {
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: company.id }),
        });
        if (!res.ok) throw new Error("Request failed");
        toast({ title: "Plan generated", description: "6-month OKR plan is ready." });
        await onUpdated();
      } catch {
        toast({ title: "Failed to generate. Try again.", variant: "destructive" });
      }
    });
  };

  if (!plan) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>6-Month Impact Plan</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">OKRs and initiatives tailored to the company’s funding + research.</div>
          </div>
          <Button onClick={generate} disabled={pending || !intel}>
            {pending ? "Generating..." : "Generate Plan"}
          </Button>
        </CardHeader>
        <CardContent>
          {pending ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : !intel ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                <path
                  d="M22 18H62V66H22V18Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.4"
                />
                <path
                  d="M30 32H54M30 42H50M30 52H46"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-base font-medium">Research required</div>
              <div className="max-w-sm text-sm text-muted-foreground">
                Generate market research first so the plan can anchor to priorities and hiring signals.
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                <path
                  d="M18 28C18 22.4772 22.4772 18 28 18H56C61.5228 18 66 22.4772 66 28V56C66 61.5228 61.5228 66 56 66H28C22.4772 66 18 61.5228 18 56V28Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.4"
                />
                <path
                  d="M30 34H54M30 44H54M30 54H46"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-base font-medium">No plan yet</div>
              <div className="max-w-sm text-sm text-muted-foreground">
                Create a month-by-month OKR plan for <span className="font-medium text-foreground">{company.name}</span>.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const monthEntries = Object.entries(plan.plan_data ?? {})
    .filter(([k]) => k.toLowerCase().startsWith("month_"))
    .sort(([a], [b]) => monthIndex(a) - monthIndex(b))
    .slice(0, 6) as Array<[string, ImpactPlanMonth]>;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <div className="text-base font-semibold">6-Month OKR Timeline</div>
          <div className="text-sm text-muted-foreground">Vertical timeline with objectives, key results, and initiatives.</div>
        </div>
        <Button onClick={generate} variant="outline" disabled={pending || !intel}>
          {pending ? "Regenerating..." : "Regenerate"}
        </Button>
      </div>

      <div className="relative grid gap-4">
        <div className="absolute left-3 top-0 hidden h-full w-px bg-border md:block" />

        {monthEntries.map(([key, month]) => (
          <div key={key} className="grid gap-3 md:grid-cols-[24px_1fr] md:items-start">
            <div className="hidden md:flex md:justify-center">
              <div className="mt-6 h-3 w-3 rounded-full bg-primary" />
            </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-base">{key.replace("_", " ").replace(/month/i, "Month")}</CardTitle>
                <Badge variant="outline">OKRs</Badge>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <div className="grid gap-1">
                  <div className="text-xs font-medium text-muted-foreground">Objective</div>
                  <div className="leading-6">{month.objective}</div>
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-medium text-muted-foreground">Key Results</div>
                  {month.key_results?.length ? (
                    <ul className="grid gap-2">
                      {firstN(month.key_results, 3).map((kr) => (
                        <li key={kr} className="leading-6">
                          {kr}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground">—</div>
                  )}
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-medium text-muted-foreground">Initiatives</div>
                  {month.initiatives?.length ? (
                    <ul className="grid gap-2">
                      {firstN(month.initiatives, 5).map((init) => (
                        <li key={init} className="leading-6">
                          {init}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground">—</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
