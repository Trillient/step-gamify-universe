import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-bold tracking-tight">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

/** Plain-language privacy policy, linked from sign-in, Settings and the App Store listing. */
const Privacy = () => (
  <main className="safe-x safe-t safe-b mx-auto min-h-screen max-w-md px-4 pb-10">
    <Link
      to="/"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Back
    </Link>
    <div className="surface mt-2 space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">Privacy policy</h1>
        <p className="text-sm font-medium text-muted-foreground">Wooly Walking Challenge 2026 · updated 3 October 2026</p>
      </div>

      <Section title="Who runs this">
        <p>
          Wooly Walking is a private family step challenge run by Ben Woolston for family and friends. It is not a
          commercial service, has no ads and sells nothing.
        </p>
      </Section>

      <Section title="What we store">
        <p>When you sign in (with Google or Apple) we keep:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>your sign-in account ID, so we know which entries are yours</li>
          <li>your display name (your account name until you change it in Settings)</li>
          <li>the weekly step totals you type in, and when you last changed each one</li>
        </ul>
        <p>
          Our server does not store your email address, password, location or contacts. Google Firebase
          Authentication, which handles sign-in, keeps the email address of the Google or Apple account you sign in
          with (or Apple's private relay address) so it can sign you in. The challenge itself only knows the numbers
          you enter.
        </p>
      </Section>

      <Section title="Apple Health (iPhone app)">
        <p>
          If you tap <strong className="text-foreground">Import from Apple Health</strong>, the iPhone app asks your
          permission to read your step count, adds up the steps for that week on your phone and puts the number in the
          box. Only that weekly total is saved, the same as if you typed it. We never read any other health data, never
          write to Health, and never use it for advertising or share it. You can turn access off any time in Settings
          &gt; Health &gt; Data Access &amp; Devices.
        </p>
      </Section>

      <Section title="Who can see it">
        <p>
          Other walkers see your display name and step totals once your challenge total reaches 1,000 steps, except
          from 26 November to 20 December, when everyone else is hidden. Final standings are shown from 21 December.
          Your email is never shown to anyone. You always see your own entries.
        </p>
      </Section>

      <Section title="Services we use">
        <p>
          Sign-in uses Google Firebase Authentication. Pages are delivered through Cloudflare, and fonts are loaded
          from Google Fonts. Your data is stored on a private server in Australia. We do not use analytics, tracking or
          advertising, and we never sell or share your data.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          Open Settings and tap <strong className="text-foreground">Delete my account</strong>. That removes your name
          and every step total straight away, takes you off the leaderboard, and (if you used Sign in with Apple)
          revokes the app's access to your Apple ID. You can also ask Ben to do it for you via the{" "}
          <Link to="/support" className="font-semibold text-primary underline-offset-4 hover:underline">
            support page
          </Link>
          .
        </p>
      </Section>

      <Section title="Kids">
        <p>The challenge is for family members. Children should take part with a parent or guardian.</p>
      </Section>
    </div>
  </main>
);

export default Privacy;
