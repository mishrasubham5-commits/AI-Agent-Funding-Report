"use client";

import * as React from "react";

import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportGenerator({
  companyId,
}: {
  companyId: string;
  existingUrl: string | null;
  onGenerated: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  const generate = () => {
    start(async () => {
      try {
        const element = document.getElementById("report-export-root");
        if (!element) throw new Error("Report content not found.");

        // @ts-expect-error html2pdf.js has no bundled TypeScript types.
        const mod = await import("html2pdf.js");
        const html2pdf = (mod.default ?? mod) as {
          (): {
            set: (options: object) => {
              from: (source: HTMLElement) => {
                save: () => Promise<void>;
              };
            };
          };
        };

        await html2pdf()
          .set({
            margin: 0.5,
            filename: `company-${companyId}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
          })
          .from(element)
          .save();

        toast({ title: "Report generated", description: "PDF downloaded in your browser." });
        setOpen(false);
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : "Failed to generate. Try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Export Package</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Package</DialogTitle>
          <DialogDescription>
            Generates the PDF directly in your browser from the company detail page content.
          </DialogDescription>
        </DialogHeader>
        {pending ? (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No server API is used. The export runs entirely in the browser.
          </div>
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
  );
}
