import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ENTRIES_KEY, useStepAutosave } from "@/hooks/use-step-autosave";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BrandMark from "./BrandMark";
import ErrorNote from "./ErrorNote";
import StatusBanner from "./StatusBanner";
import SummaryStats from "./SummaryStats";
import StepEntry from "./StepEntry";
import MyProgress from "./MyProgress";
import Leaderboard from "./Leaderboard";
import DisplayName from "./DisplayName";

const Dashboard = () => {
  const { user, logout, getToken } = useAuth();
  const challenge = useQuery({ queryKey: ["challenge"], queryFn: api.challenge, refetchInterval: 5 * 60_000 });
  const entries = useQuery({ queryKey: ENTRIES_KEY, queryFn: () => api.entries(getToken) });
  const board = useQuery({ queryKey: ["leaderboard"], queryFn: () => api.leaderboard(getToken) });
  const autosave = useStepAutosave();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    // don't drop a step total that is still waiting to be sent
    await autosave.settled();
    await logout();
  };

  const c = challenge.data;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="truncate font-semibold tracking-tight">
              Wooly Walking <span className="font-normal text-muted-foreground">2026</span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            {user?.displayName && (
              <span className="hidden max-w-[16rem] truncate text-sm text-muted-foreground sm:inline">
                {user.displayName}
              </span>
            )}
            <Button variant="ghost" onClick={signOut} disabled={signingOut} className="h-11 px-3">
              <LogOut aria-hidden /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
        {challenge.isError && !c && (
          <ErrorNote message="Could not load the challenge details." onRetry={() => challenge.refetch()} />
        )}

        {!c && challenge.isLoading && (
          <div className="space-y-5" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-28 rounded-xl" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-80 rounded-xl" />
          </div>
        )}

        {c && (
          <>
            <StatusBanner challenge={c} />
            <SummaryStats
              challenge={c}
              entries={entries.data?.entries}
              board={board.data}
              boardFailed={board.isError}
              autosave={autosave}
            />
            <div className="grid gap-5 sm:gap-6 lg:grid-cols-5">
              <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-3">
                <StepEntry challenge={c} entries={entries} autosave={autosave} />
                <MyProgress challenge={c} entries={entries.data?.entries} autosave={autosave} />
              </div>
              <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-2">
                <Leaderboard challenge={c} board={board} />
                <DisplayName />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
