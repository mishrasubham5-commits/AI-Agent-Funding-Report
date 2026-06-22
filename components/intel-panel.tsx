"use client";

import * as React from "react";

import type { Company, CompanyIntel } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function IntelPanel({
  company,
  intel,
  onUpdated,
}: {
  company: Company;
  intel: CompanyIntel | null;
  onUpdated: () => Promise<void>;
}) {
  const [pending, start] = React.useTransition();

  const getErrorMessage = async (res: Response) => {
    try {
      const payload = (await res.json()) as { error?: string };
      return payload.error ?? "Failed to generate. Try again.";
    } catch {
      return "Failed to generate. Try again.";
    }
  };

  const generate = () => {
    start(async () => {
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: company.id }),
        });
        if (!res.ok) throw new Error(await getErrorMessage(res));
        toast({ title: "Research generated", description: "Market research is ready." });
        await onUpdated();
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : "Failed to generate. Try again.",
          variant: "destructive",
        });
      }
    });
  };

  if (!intel) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Market Research</CardTitle>
          <Button onClick={generate} disabled={pending}>
            {pending ? "Generating..." : "Generate Research"}
          </Button>
        </CardHeader>
        <CardContent>
          {pending ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                <path
                  d="M18 18H66V66H18V18Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.4"
                />
                <path
                  d="M26 30H58M26 40H46M26 50H54"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-base font-medium">No research yet</div>
              <div className="max-w-sm text-sm text-muted-foreground">
                Generate competitor analysis, business model summary, TAM estimate, and hiring signals for{" "}
                <span className="font-medium text-foreground">{company.name}</span>.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Analyst Summary</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">Gemini-synthesized view of the company from public search signals.</div>
          </div>
          <Button onClick={generate} variant="outline" disabled={pending}>
            {pending ? "Regenerating..." : "Regenerate"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="leading-6">{intel.summary}</div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">Business model</div>
            <div className="leading-6">{intel.business_model}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">TAM estimate</div>
            <div className="leading-6">{intel.tam_estimate}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitors</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {intel.competitors.length ? (
              intel.competitors.map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth Priorities</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {intel.growth_priorities ? (
              <div className="whitespace-pre-wrap leading-6 text-muted-foreground">{intel.growth_priorities}</div>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hiring Signals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {intel.hiring_signals ? (
              <div className="whitespace-pre-wrap leading-6 text-muted-foreground">{intel.hiring_signals}</div>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
