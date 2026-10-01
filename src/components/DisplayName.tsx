import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The name other walkers see on the leaderboard. Saved explicitly with a button. */
const DisplayName = () => {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.me(getToken) });
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? me.data?.displayName ?? "";

  const save = useMutation({
    mutationFn: (n: string) => api.setName(getToken, n),
    onSuccess: (res) => {
      qc.setQueryData(["me"], res);
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  const trimmed = name.trim();
  const changed = me.data !== undefined && trimmed !== "" && trimmed !== me.data.displayName;

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="name-heading">
      <h2 id="name-heading" className="text-lg font-semibold tracking-tight">
        Your name
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">How you appear to other walkers on the board.</p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed) save.mutate(trimmed);
        }}
      >
        <label htmlFor="display-name" className="sr-only">
          Name shown on the leaderboard
        </label>
        <Input
          id="display-name"
          value={name}
          maxLength={40}
          autoComplete="nickname"
          disabled={!me.data}
          onChange={(e) => {
            setDraft(e.target.value);
            save.reset();
          }}
          aria-describedby="name-status"
          className="h-11 min-w-0 flex-1"
        />
        <Button type="submit" variant="outline" className="h-11" disabled={!changed || save.isPending}>
          {save.isPending ? "Saving…" : "Save name"}
        </Button>
      </form>
      <p id="name-status" role="status" aria-live="polite" className="mt-2 min-h-5 text-sm">
        {save.isSuccess && (
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-primary" aria-hidden /> Name saved
          </span>
        )}
        {save.isError && <span className="text-destructive">Could not save your name. {save.error.message}</span>}
        {me.isError && <span className="text-destructive">Could not load your name.</span>}
      </p>
    </section>
  );
};

export default DisplayName;
