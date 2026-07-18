import type { ReportsData } from "@/lib/reports/types";

/** Build CSV text for client-side download (no server storage). */
export function buildReportsCsv(data: ReportsData): string {
  const header = [
    "scope",
    "period",
    "agent_name",
    "agent_email",
    "role",
    "messages",
    "leads_created",
    "status_changes",
    "closings",
    "followups",
  ];

  const escape = (value: string | number) => {
    const text = String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };

  const lines = [header.join(",")];

  lines.push(
    [
      "agency",
      data.period,
      data.agencyName,
      "",
      "",
      data.agency.messages,
      data.agency.leadsCreated,
      data.agency.statusChanges,
      data.agency.closings,
      data.agency.followups,
    ]
      .map(escape)
      .join(","),
  );

  for (const agent of data.agents) {
    lines.push(
      [
        "agent",
        data.period,
        agent.name,
        agent.email,
        agent.role,
        agent.messages,
        agent.leadsCreated,
        agent.statusChanges,
        agent.closings,
        agent.followups,
      ]
        .map(escape)
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}
