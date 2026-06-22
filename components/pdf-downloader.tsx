"use client";

import { Button } from "@/components/ui/button";

export function PdfDownloader({ url }: { url: string }) {
  return (
    <Button asChild>
      <a href={url} target="_blank" rel="noreferrer">
        Download PDF
      </a>
    </Button>
  );
}

