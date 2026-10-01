import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api, type ChallengeInfo } from "@/lib/api";
import { fmtSteps } from "@/lib/format";

const Leaderboard = ({ challenge }: { challenge: ChallengeInfo }) => {
  const { getToken } = useAuth();
  const [view, setView] = useState<"total" | number>("total");
  const board = useQuery({ queryKey: ["leaderboard"], queryFn: () => api.leaderboard(getToken) });

  const weeks = challenge.periods.filter((p) => p.start <= challenge.today);

  const ranked = (board.data?.rows ?? [])
    .map((r) => ({ ...r, value: view === "total" ? r.total : r.weeks[String(view)] }))
    .filter((r) => r.value !== undefined)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  return (
    <section className="rounded-xl border bg-white/80 dark:bg-gray-900/80 p-4 space-y-3">
      <h2 className="text-lg font-semibold">Leaderboard</h2>

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Leaderboard view">
        {(["total", ...weeks.map((p) => p.week)] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
              view === v ? "bg-emerald-600 text-white border-emerald-600" : "bg-background"
            }`}
          >
            {v === "total" ? "Total" : `W${v}`}
          </button>
        ))}
      </div>

      {board.data?.othersHidden && (
        <p className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">
          {board.data.phase === "final-weeks"
            ? "The final four weeks are blind: only your own steps are shown until the challenge ends."
            : "Other walkers appear once the challenge starts."}
        </p>
      )}
      {board.data && !board.data.othersHidden && board.data.phase === "open" && (
        <p className="text-xs text-muted-foreground">
          Other walkers appear once their challenge total reaches {fmtSteps(board.data.publicMinSteps)} steps.
        </p>
      )}

      {board.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {board.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not load the leaderboard.
        </p>
      )}

      {board.data && ranked.length === 0 && <p className="text-sm text-muted-foreground">No steps to show yet.</p>}

      <ol className="divide-y">
        {ranked.map((r, i) => (
          <li key={r.id} className={`flex items-center gap-3 py-2 ${r.isMe ? "font-semibold" : ""}`}>
            <span className="w-6 text-right text-sm text-muted-foreground">{i + 1}</span>
            <span className="flex-1 truncate">
              {r.name}
              {r.isMe && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">you</span>}
            </span>
            <span className="tabular-nums">{fmtSteps(r.value)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default Leaderboard;
