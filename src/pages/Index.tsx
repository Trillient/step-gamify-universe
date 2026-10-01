import { Footprints, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { user, signInWithGoogle, configured } = useAuth();

  if (user) return <Dashboard />;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md rounded-2xl border bg-white/80 dark:bg-gray-900/80 p-8 text-center shadow-sm space-y-6">
        <Footprints className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Wooly Walking Challenge 2026</h1>
          <p className="text-muted-foreground">
            1 October to 20 December. Log your total steps once a week and see how the family is going.
          </p>
        </div>
        {configured ? (
          <Button onClick={signInWithGoogle} className="w-full gap-2" size="lg">
            <LogIn className="h-4 w-4" /> Sign in with Google
          </Button>
        ) : (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Sign-in is not configured for this deployment (missing Firebase settings).
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          From 26 November other walkers' steps are hidden until the challenge ends.
        </p>
      </div>
    </main>
  );
};

export default Index;
