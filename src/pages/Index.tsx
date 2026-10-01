import { CalendarDays, Loader2, LogIn, ShieldCheck, Trophy } from "lucide-react";
import { CHALLENGE_END, CHALLENGE_START, WEEK_COUNT } from "@shared/challenge";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import Dashboard from "@/components/Dashboard";
import PrivacyTimeline from "@/components/PrivacyTimeline";
import { fmtDay } from "@/lib/format";

const steps = [
  {
    icon: LogIn,
    title: "Sign in with Google",
    body: "Others see your Google name, which you can change. Your email is never shown to other walkers.",
  },
  {
    icon: CalendarDays,
    title: "Log one total a week",
    body: `Any time after a week starts, until ${fmtDay(CHALLENGE_END)}. A rest week counts too: enter 0.`,
  },
  {
    icon: Trophy,
    title: "See how the family is going",
    body: "Your total, your best week and where you sit on the board.",
  },
];

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
    <main className="min-h-screen">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:py-16 md:grid-cols-[1.1fr_1fr] md:gap-14 md:py-24">
        <section className="flex flex-col justify-center space-y-7">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="eyebrow">
              {fmtDay(CHALLENGE_START)} to {fmtDay(CHALLENGE_END)} 2026
            </span>
          </div>
          <div className="space-y-4">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Wooly Walking Challenge 2026
            </h1>
            <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
              {WEEK_COUNT} weeks of family walking. Log your step total once a week and see how everyone is going.
            </p>
          </div>

          <div className="space-y-3">
            {configured ? (
              <Button onClick={signInWithGoogle} size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
                <LogIn aria-hidden /> Sign in with Google
              </Button>
            ) : (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Sign-in is not configured for this deployment (missing Firebase settings).
              </p>
            )}
          </div>

          <ol className="space-y-4 border-t pt-7">
            {steps.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="privacy-heading" className="surface self-center p-6 sm:p-7">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="privacy-heading" className="text-lg font-semibold">
              Who sees your steps
            </h2>
          </div>
          <PrivacyTimeline />
          <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
            You always see your own entries. Dates follow Brisbane time, so each week rolls over at midnight there.
          </p>
        </section>
      </div>
    </main>
  );
};

export default Index;
