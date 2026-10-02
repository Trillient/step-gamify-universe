import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Home, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ENTRIES_KEY, useStepAutosave } from "@/hooks/use-step-autosave";
import { startedPeriods } from "@/lib/steps";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ErrorNote from "./ErrorNote";
import StatusBanner from "./StatusBanner";
import SummaryStats from "./SummaryStats";
import StepEntry from "./StepEntry";
import MyProgress from "./MyProgress";
import Leaderboard from "./Leaderboard";
import DisplayName from "./DisplayName";
import JourneyCard from "./JourneyCard";
import StatsHero from "./StatsHero";
import YourWeeks from "./YourWeeks";
import PrivacyTimeline from "./PrivacyTimeline";

type Tab = "home" | "stats" | "settings";

const tabFromHash = (): Tab => {
  const h = window.location.hash.slice(1);
  return h === "stats" || h === "settings" ? h : "home";
};

const Dashboard = () => {
  const { user, logout, getToken } = useAuth();
  const challenge = useQuery({ queryKey: ["challenge"], queryFn: api.challenge, refetchInterval: 5 * 60_000 });
  const entries = useQuery({ queryKey: ENTRIES_KEY, queryFn: () => api.entries(getToken) });
  const board = useQuery({ queryKey: ["leaderboard"], queryFn: () => api.leaderboard(getToken) });
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.me(getToken) });
  const autosave = useStepAutosave();
  const [signingOut, setSigningOut] = useState(false);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [selected, setSelected] = useState<number | null>(null);

  // the tab lives in the URL hash so the back button and a refresh keep it
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (next: Tab) => {
    if (next !== tab) window.location.hash = next === "home" ? "" : next;
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const signOut = async () => {
    setSigningOut(true);
    // don't drop a step total that is still waiting to be sent
    await autosave.settled();
    await logout();
  };

  const c = challenge.data;
  const name = me.data?.displayName || user?.displayName || "";
  const firstName = name.split(/\s+/)[0];
  const initial = (firstName.charAt(0) || "?").toUpperCase();
  const chosen = c ? (selected ?? c.currentWeek ?? startedPeriods(c.periods, c.today).at(-1)?.week ?? null) : null;

  const selectWeek = (week: number) => {
    autosave.flush();
    setSelected(week);
  };

  return (
    <div className="min-h-screen">
      <div className="safe-x safe-t mx-auto w-full max-w-md px-4 pb-36">
        <header className="flex items-center justify-between gap-3 pb-6 pt-4">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black tracking-tight">Wooly Walking</h1>
            <p className="mt-1 truncate text-sm font-bold text-muted-foreground">
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-card bg-brand-soft text-xl font-black text-brand-soft-foreground shadow-sm transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Account"
            >
              {initial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              {name && <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>}
              {name && <DropdownMenuSeparator />}
              <DropdownMenuItem className="min-h-11 rounded-xl font-semibold" onSelect={() => go("settings")}>
                <Settings className="mr-2 h-4 w-4" aria-hidden /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11 rounded-xl font-semibold"
                disabled={signingOut}
                onSelect={() => void signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="space-y-6">
          {challenge.isError && !c && (
            <ErrorNote message="Could not load the challenge details." onRetry={() => challenge.refetch()} />
          )}

          {!c && challenge.isLoading && (
            <div className="space-y-6" aria-busy="true" aria-label="Loading">
              <Skeleton className="h-24 rounded-[2rem]" />
              <Skeleton className="h-64 rounded-[2rem]" />
              <Skeleton className="h-40 rounded-[2rem]" />
            </div>
          )}

          {c && tab === "home" && (
            <div key="home" className="animate-fade-in space-y-6">
              <StatusBanner challenge={c} />
              <StepEntry challenge={c} entries={entries} autosave={autosave} chosen={chosen} onSelect={selectWeek} />
              <JourneyCard challenge={c} entries={entries.data?.entries} autosave={autosave} />
              <Leaderboard challenge={c} board={board} />
            </div>
          )}

          {c && tab === "stats" && (
            <div key="stats" className="animate-fade-in space-y-6">
              <StatsHero challenge={c} entries={entries.data?.entries} autosave={autosave} />
              <SummaryStats
                challenge={c}
                entries={entries.data?.entries}
                board={board.data}
                boardFailed={board.isError}
                autosave={autosave}
              />
              <MyProgress challenge={c} entries={entries.data?.entries} autosave={autosave} />
              <YourWeeks
                challenge={c}
                entries={entries.data?.entries}
                autosave={autosave}
                onOpenWeek={(week) => {
                  selectWeek(week);
                  go("home");
                }}
              />
            </div>
          )}

          {c && tab === "settings" && (
            <div key="settings" className="animate-fade-in space-y-6">
              <DisplayName />
              <section className="surface p-6" aria-labelledby="privacy-heading">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                  <h2 id="privacy-heading" className="text-xl font-bold tracking-tight">
                    Who sees your steps
                  </h2>
                </div>
                <PrivacyTimeline />
                <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                  You always see your own entries. Dates follow Brisbane time, so each week rolls over at midnight there.
                </p>
              </section>
              <section className="surface space-y-4 p-6" aria-labelledby="account-heading">
                <div className="space-y-1">
                  <h2 id="account-heading" className="text-xl font-bold tracking-tight">
                    Account
                  </h2>
                  <p className="truncate text-sm font-medium text-muted-foreground">
                    {user?.email ? `Signed in with Google as ${user.email}` : "Signed in with Google"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={signingOut}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 bg-card font-bold transition-transform hover:bg-secondary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden /> Sign out
                </button>
              </section>
            </div>
          )}
        </main>
      </div>

      <nav
        aria-label="Sections"
        className="safe-x fixed inset-x-0 bottom-0 z-40 border-t bg-card/80 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {(
            [
              ["home", "Home", Home],
              ["stats", "Stats", BarChart3],
              ["settings", "Settings", Settings],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => go(value)}
              aria-current={tab === value ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === value ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={2.5} aria-hidden />
              <span className="text-[11px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
