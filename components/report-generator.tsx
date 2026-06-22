"use client";

import * as React from "react";

import { PdfDownloader } from "@/components/pdf-downloader";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportGenerator({
  companyId,
  existingUrl,
  onGenerated,
}: {
  companyId: string;
  existingUrl: string | null;
  onGenerated: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const url = generatedUrl ?? existingUrl;

  const generate = () => {
    start(async () => {
      try {
        const res = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: companyId }),
        });
        if (!res.ok) throw new Error("Request failed");
        const payload = (await res.json()) as { url: string };
        setGeneratedUrl(payload.url);
        toast({ title: "Report generated", description: "PDF is ready to download." });
        await onGenerated();
      } catch {
        toast({ title: "Failed to generate. Try again.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {url ? <PdfDownloader url={url} /> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={url ? "outline" : "default"}>Export Package</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Package</DialogTitle>
            <DialogDescription>
              Generates a PDF package including funding snapshot, research, 6-month plan, and outreach drafts.
            </DialogDescription>
          </DialogHeader>
          {pending ? (
            <div className="grid gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : url ? (
            <div className="text-sm text-muted-foreground">A recent PDF already exists. You can regenerate to update it.</div>
          ) : (
            <div className="text-sm text-muted-foreground">No PDF yet. Generate one now.</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Close
            </Button>
            <Button onClick={generate} disabled={pending}>
              {pending ? "Generating..." : "Generate PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
