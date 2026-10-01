export const fmtSteps = (n: number) => n.toLocaleString("en-AU");

/** "2026-10-01" -> "1 Oct" without going through the local time zone. */
export function fmtDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
