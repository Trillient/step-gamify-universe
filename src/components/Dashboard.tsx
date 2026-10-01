import { useQuery } from "@tanstack/react-query";
import { Footprints, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import StatusBanner from "./StatusBanner";
import StepEntry from "./StepEntry";
import MyProgress from "./MyProgress";
import Leaderboard from "./Leaderboard";
import DisplayName from "./DisplayName";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const challenge = useQuery({ queryKey: ["challenge"], queryFn: api.challenge, refetchInterval: 5 * 60_000 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-950">
      <header className="border-b bg-white/70 dark:bg-gray-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <Footprints className="h-5 w-5 text-emerald-600" aria-hidden />
            <span>Wooly Walking 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.displayName}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-1">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {challenge.isError && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Could not load the challenge details. Please refresh.
          </p>
        )}
        {challenge.data && (
          <>
            <StatusBanner challenge={challenge.data} />
            <StepEntry challenge={challenge.data} />
            <MyProgress challenge={challenge.data} />
            <Leaderboard challenge={challenge.data} />
          </>
        )}
        {challenge.isLoading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
      </main>
    </div>
  );
};

export default Dashboard;
