import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { api, type ChallengeInfo } from "@/lib/api";
import { fmtSteps } from "@/lib/format";

const MyProgress = ({ challenge }: { challenge: ChallengeInfo }) => {
  const { getToken } = useAuth();
  const { data } = useQuery({ queryKey: ["entries"], queryFn: () => api.entries(getToken) });
  if (!data) return null;

  const byWeek = new Map(data.entries.map((e) => [e.week, e.steps]));
  const rows = challenge.periods
    .filter((p) => p.start <= challenge.today)
    .map((p) => ({ label: `W${p.week}`, steps: byWeek.get(p.week) ?? 0 }));
  const total = data.entries.reduce((a, e) => a + e.steps, 0);

  return (
    <section className="rounded-xl border bg-white/80 dark:bg-gray-900/80 p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Your progress</h2>
        <p className="text-sm text-muted-foreground">{fmtSteps(total)} steps in total</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to show yet.</p>
      ) : (
        <div className="h-48" role="img" aria-label="Your weekly step totals">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} fontSize={12} />
              <YAxis width={44} tickLine={false} fontSize={12} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip formatter={(v: number) => [fmtSteps(v), "Steps"]} />
              <Bar dataKey="steps" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export default MyProgress;
