export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Company {
  id: string;
  name: string;
  funding_amount: string | null;
  funding_round: string | null;
  funding_date: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  status: string | null;
  created_at: string;
}

export interface CompanyIntel {
  id: string;
  company_id: string;
  summary: string;
  business_model: string;
  tam_estimate: string;
  competitors: string[];
  growth_priorities: string | null;
  hiring_signals: string | null;
  generated_at: string;
}

export interface ImpactPlanMonth {
  objective: string;
  key_results: string[];
  initiatives: string[];
}

export interface ImpactPlan {
  id: string;
  company_id: string;
  plan_data: Record<string, ImpactPlanMonth>;
  generated_at: string;
}

export interface OutreachDraft {
  id: string;
  company_id: string;
  variant: string;
  subject_line: string;
  body: string;
  generated_at: string;
}

export interface Report {
  id: string;
  company_id: string;
  pdf_url: string;
  created_at: string;
}

export interface FundingDiscoveryItem {
  name: string;
  funding_amount: number | null;
  funding_round: string | null;
  funding_date: string | null;
  source_url: string;
  source_title: string;
}

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}
