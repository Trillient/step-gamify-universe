import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";

// Assembled at runtime so the address isn't sitting in the page source for scrapers.
const contact = ["bcwoolston", "gmail.com"].join("@");

const faqs: [string, string][] = [
  [
    "I can't sign in from Messenger or Instagram",
    "Sign-in doesn't work inside other apps' built-in browsers. Tap Open in Safari (or Open in Chrome) on the sign-in page, or open steps.woolston.dev in your browser.",
  ],
  [
    "Why can't I see other walkers?",
    "Walkers appear on the leaderboard once their total reaches 1,000 steps. From 26 November to 20 December everyone else is hidden on purpose, and the final standings are revealed on 21 December.",
  ],
  [
    "Can I change a week I already logged?",
    "Yes. Pick the week with the arrows on Home (or tap it under Stats > Your weeks) and type the new total. It saves by itself.",
  ],
  [
    "How does Import from Apple Health work?",
    "In the iPhone app, tap Import from Apple Health under Log this week. With your permission it adds up your steps for that week on your phone and fills in the box. You can turn access off in Settings > Health > Data Access & Devices.",
  ],
  [
    "How do I change my name or delete my account?",
    "Open Settings. Your name is at the top, and Delete my account removes your name and every step total straight away.",
  ],
];

/** Support page: answers to common questions plus a way to reach the organiser (App Store support URL). */
const Support = () => (
  <main className="safe-x safe-t safe-b mx-auto min-h-screen max-w-md px-4 pb-10">
    <Link
      to="/"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Back
    </Link>
    <div className="surface mt-2 space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">Help &amp; support</h1>
        <p className="text-sm font-medium text-muted-foreground">Wooly Walking Challenge 2026</p>
      </div>

      <section className="space-y-4">
        {faqs.map(([q, a]) => (
          <div key={q} className="space-y-1">
            <h2 className="font-bold">{q}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 border-t pt-5">
        <h2 className="text-lg font-bold tracking-tight">Still stuck?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Email Ben, who runs the challenge. Include your display name and what you were trying to do.
        </p>
        <a
          href={`mailto:${contact}?subject=${encodeURIComponent("Wooly Walking help")}`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        >
          <Mail className="h-4 w-4" aria-hidden /> Email support
        </a>
        <p className="text-center text-xs text-muted-foreground">{contact}</p>
      </section>
    </div>
  </main>
);

export default Support;
