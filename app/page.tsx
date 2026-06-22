import { CompanyCard } from "@/components/company-card";
import { FundingTable } from "@/components/funding-table";
import { supabase } from "@/lib/supabase";
import type { Company } from "@/types";

function toNumber(value: string | null) {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function DashboardPage() {
  const { data: companiesData } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  const companies = (companiesData ?? []) as Company[];

  const totalFunding = companies.reduce((sum, c) => sum + toNumber(c.funding_amount), 0);
  const formattedFunding = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(totalFunding);

  const { count: reportsCount } = await supabase.from("reports").select("id", { count: "exact", head: true });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Discover funded startups, generate PM market research, build 6-month impact plans, and ship outreach + PDFs.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CompanyCard title="Total Companies" value={String(companies.length)} />
        <CompanyCard title="Total Funding" value={formattedFunding} />
        <CompanyCard title="Ready Reports" value={String(reportsCount ?? 0)} />
      </div>

      <div className="mt-6">
        <FundingTable companies={companies} />
      </div>
    </div>
  );
}
