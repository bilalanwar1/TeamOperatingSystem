"use client";

import { Button } from "@/components/ui/button";
import { buildReportsCsv } from "@/lib/reports/csv";
import type { ReportsData } from "@/lib/reports/types";

type ExportReportsCsvButtonProps = {
  data: ReportsData;
};

export function ExportReportsCsvButton({ data }: ExportReportsCsvButtonProps) {
  function handleExport() {
    const csv = buildReportsCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `teamos-${data.agencySlug}-${data.period}-${stamp}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" onClick={handleExport}>
      Export CSV
    </Button>
  );
}
