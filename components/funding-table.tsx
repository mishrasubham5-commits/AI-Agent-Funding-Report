"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Company } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function statusVariant(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("report")) return "default";
  if (s.includes("outreach")) return "secondary";
  if (s.includes("plan")) return "secondary";
  if (s.includes("research")) return "outline";
  return "outline";
}

export function FundingTable({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [discoverPending, startDiscover] = React.useTransition();
  const [intelPendingId, setIntelPendingId] = React.useState<string | null>(null);

  const getErrorMessage = async (res: Response) => {
    try {
      const payload = (await res.json()) as { error?: string };
      return payload.error ?? "Failed to generate. Try again.";
    } catch {
      return "Failed to generate. Try again.";
    }
  };

  const onDiscover = () => {
    startDiscover(async () => {
      try {
        const res = await fetch("/api/discover", { method: "POST" });
        if (!res.ok) throw new Error(await getErrorMessage(res));
        const payload = (await res.json()) as { inserted: number };
        toast({ title: "Funding discovered", description: `Added ${payload.inserted} new companies.` });
        router.refresh();
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : "Failed to generate. Try again.",
          variant: "destructive",
        });
      }
    });
  };

  const onGenerateIntel = (companyId: string) => {
    setIntelPendingId(companyId);
    startDiscover(async () => {
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: companyId }),
        });
        if (!res.ok) throw new Error(await getErrorMessage(res));
        toast({ title: "Research generated", description: "Market research is ready." });
        router.refresh();
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : "Failed to generate. Try again.",
          variant: "destructive",
        });
      } finally {
        setIntelPendingId(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Funding Pipeline</CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">Discover newly funded startups and build a PM-ready package.</div>
        </div>
        <Button onClick={onDiscover} disabled={discoverPending}>
          {discoverPending ? "Discovering..." : "Discover Funding"}
        </Button>
      </CardHeader>
      <CardContent>
        {discoverPending && companies.length === 0 ? (
          <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <div className="text-base font-medium">No companies yet</div>
            <div className="max-w-sm text-sm text-muted-foreground">
              Click <span className="font-medium text-foreground">Discover Funding</span> to pull the latest funding news.
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Funding</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{formatFundingAmount(c.funding_amount)}</TableCell>
                  <TableCell>{c.funding_round ?? "—"}</TableCell>
                  <TableCell>{formatDate(c.funding_date)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>{c.status ?? "discovered"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/company/${c.id}`}>View</Link>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={discoverPending || intelPendingId === c.id}
                        onClick={() => onGenerateIntel(c.id)}
                      >
                        {intelPendingId === c.id ? "Generating..." : "Generate Intel"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
