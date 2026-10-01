import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api, type OwnEntry } from "@/lib/api";
import { AutosaveQueue } from "@/lib/autosave";

export const ENTRIES_KEY = ["entries"] as const;
const AUTOSAVE_DELAY_MS = 900;

/**
 * One autosave queue for the signed-in user's weekly entries. Re-renders on
 * every queue state change. Saves write straight into the entries cache, and
 * any entries refetch already in flight is cancelled first so an older
 * response cannot land after a newer save.
 */
export function useStepAutosave(): AutosaveQueue {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const deps = useRef({ getToken, qc });
  deps.current = { getToken, qc };

  const [queue] = useState(
    () =>
      new AutosaveQueue({
        delayMs: AUTOSAVE_DELAY_MS,
        save: async (week, steps) => {
          const { getToken, qc } = deps.current;
          await qc.cancelQueries({ queryKey: ENTRIES_KEY });
          const saved = await api.saveEntry(getToken, week, steps);
          qc.setQueryData<{ entries: OwnEntry[] }>(ENTRIES_KEY, (old) => ({
            entries: [...(old?.entries ?? []).filter((e) => e.week !== saved.week), saved].sort(
              (a, b) => a.week - b.week,
            ),
          }));
          qc.invalidateQueries({ queryKey: ["leaderboard"] });
        },
      }),
  );

  useSyncExternalStore(queue.subscribe, queue.getVersion);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!queue.hasUnsaved()) return;
      queue.flush();
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      // send anything still waiting on the debounce (e.g. on sign-out)
      queue.flush();
    };
  }, [queue]);

  return queue;
}
