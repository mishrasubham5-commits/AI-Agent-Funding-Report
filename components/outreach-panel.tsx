"use client";

import * as React from "react";

import type { Company, CompanyIntel, ImpactPlan, OutreachDraft } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

export function OutreachPanel({
  company,
  intel,
  plan,
  drafts,
  onUpdated,
}: {
  company: Company;
  intel: CompanyIntel | null;
  plan: ImpactPlan | null;
  drafts: OutreachDraft[];
  onUpdated: () => Promise<void>;
}) {
  const [pending, start] = React.useTransition();

  const canGenerate = Boolean(intel && plan);

  const generate = () => {
    start(async () => {
      try {
        const res = await fetch("/api/outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: company.id }),
        });
        if (!res.ok) throw new Error("Request failed");
        toast({ title: "Outreach generated", description: "3 variants are ready to copy." });
        await onUpdated();
      } catch {
        toast({ title: "Failed to generate. Try again.", variant: "destructive" });
      }
    });
  };

  const onCopy = (subject: string, body: string) => {
    start(async () => {
      try {
        await copy(`Subject: ${subject}\n\n${body}`);
        toast({ title: "Copied to clipboard" });
      } catch {
        toast({ title: "Copy failed", variant: "destructive" });
      }
    });
  };

  if (!drafts.length) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Outreach Drafts</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">Founder email, hiring-manager email, and LinkedIn intro.</div>
          </div>
          <Button onClick={generate} disabled={pending || !canGenerate}>
            {pending ? "Generating..." : "Generate Outreach"}
          </Button>
        </CardHeader>
        <CardContent>
          {pending ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !canGenerate ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                <path
                  d="M18 28C18 22.4772 22.4772 18 28 18H56C61.5228 18 66 22.4772 66 28V56C66 61.5228 61.5228 66 56 66H28C22.4772 66 18 61.5228 18 56V28Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.4"
                />
                <path
                  d="M26 32H58M26 42H54M26 52H46"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-base font-medium">Research + plan required</div>
              <div className="max-w-sm text-sm text-muted-foreground">
                Generate market research and a 6-month plan first so outreach can be specific and credible.
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                <path
                  d="M24 24H60V60H24V24Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.4"
                />
                <path
                  d="M30 36L42 44L54 36"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M30 50H54"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-base font-medium">No drafts yet</div>
              <div className="max-w-sm text-sm text-muted-foreground">
                Generate 3 outreach variants tailored to <span className="font-medium text-foreground">{company.name}</span>.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const topThree = drafts.slice(0, 3);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <div className="text-base font-semibold">Outreach Variants</div>
          <div className="text-sm text-muted-foreground">Copy-ready drafts generated by Gemini.</div>
        </div>
        <Button onClick={generate} variant="outline" disabled={pending || !canGenerate}>
          {pending ? "Regenerating..." : "Regenerate"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {topThree.map((d) => (
          <Card key={d.id} className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="text-base">{d.variant}</CardTitle>
              <div className="mt-1 text-xs text-muted-foreground">{d.subject_line}</div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{d.body}</div>
              <div className="mt-auto">
                <Button variant="secondary" className="w-full" onClick={() => onCopy(d.subject_line, d.body)}>
                  Copy to clipboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
