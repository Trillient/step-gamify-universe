import { ChevronDown, Footprints, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { CHALLENGE_END, CHALLENGE_START, WEEK_COUNT } from "@shared/challenge";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/components/Dashboard";
import PrivacyTimeline from "@/components/PrivacyTimeline";
import { fmtDay } from "@/lib/format";

const howItWorks = [
  ["Sign in with Google", "Others see your Google name, which you can change. Your email is never shown to other walkers."],
  ["Log one total a week", `Any time after a week starts, until ${fmtDay(CHALLENGE_END)}. A rest week counts too: enter 0.`],
  ["See how the family is going", "Your total, your best week and where you sit on the board."],
] as const;

const GoogleG = () => (
  <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
);

const Fold = ({ icon: Icon, title, children }: { icon: typeof ShieldCheck; title: string; children: React.ReactNode }) => (
  <details className="surface group overflow-hidden text-left">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <span className="flex-1">{title}</span>
      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
    </summary>
    <div className="border-t px-5 py-4">{children}</div>
  </details>
);

const Index = () => {
  const { user, loading, signInWithGoogle, configured } = useAuth();

  if (user) return <Dashboard />;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading</span>
      </main>
    );
  }

  return (
    <main className="safe-x safe-t safe-b flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up space-y-8 py-10 text-center">
        <div className="mx-auto flex h-24 w-24 rotate-3 items-center justify-center rounded-[2rem] bg-brand-soft text-primary shadow-lg shadow-primary/20">
          <Footprints className="h-12 w-12" strokeWidth={2.5} aria-hidden />
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-black leading-[0.95] tracking-tight">
            Wooly
            <br />
            Walking
          </h1>
          <p className="text-lg font-bold text-muted-foreground">The 2026 Family Challenge</p>
          <p className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary-foreground">
            {fmtDay(CHALLENGE_START)} to {fmtDay(CHALLENGE_END)} · {WEEK_COUNT} weeks
          </p>
        </div>

        {configured ? (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 bg-card text-base font-bold shadow-sm transition-transform hover:bg-secondary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <GoogleG /> Continue with Google
          </button>
        ) : (
          <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Sign-in is not configured for this deployment (missing Firebase settings).
          </p>
        )}

        <div className="space-y-3">
          <Fold icon={Sparkles} title="How it works">
            <ol className="space-y-3">
              {howItWorks.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-black text-brand-soft-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold">{title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Fold>
          <Fold icon={ShieldCheck} title="Who sees your steps">
            <PrivacyTimeline />
            <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
              You always see your own entries. Dates follow Brisbane time, so each week rolls over at midnight there.
            </p>
          </Fold>
          <a
            href="/privacy"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
          >
            Privacy policy
          </a>
        </div>
      </div>
    </main>
  );
};

export default Index;
