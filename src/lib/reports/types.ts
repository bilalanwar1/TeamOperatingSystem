import type { AgencyRole } from "@/lib/auth/roles";

export type ReportPeriod = "daily" | "weekly";

export type AgentReportRow = {
  agentId: string;
  name: string;
  email: string;
  role: AgencyRole;
  messages: number;
  leadsCreated: number;
  statusChanges: number;
  closings: number;
  followups: number;
};

export type AgencyReportTotals = {
  messages: number;
  leadsCreated: number;
  statusChanges: number;
  closings: number;
  followups: number;
  activeAgents: number;
};

export type ReportsData = {
  period: ReportPeriod;
  periodLabel: string;
  agencyName: string;
  agencySlug: string;
  agents: AgentReportRow[];
  agency: AgencyReportTotals;
};
