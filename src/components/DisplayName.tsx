import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The name other walkers see on the leaderboard. */
const DisplayName = () => {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.me(getToken) });
  const [name, setName] = useState("");

  useEffect(() => {
    if (me.data) setName(me.data.displayName);
  }, [me.data]);

  const save = useMutation({
    mutationFn: (n: string) => api.setName(getToken, n),
    onSuccess: () => {
      toast.success("Name updated");
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changed = me.data && name.trim() !== "" && name.trim() !== me.data.displayName;

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (changed) save.mutate(name.trim());
      }}
    >
      <div className="flex-1 space-y-1">
        <label htmlFor="display-name" className="text-xs text-muted-foreground">
          Name shown on the leaderboard
        </label>
        <Input id="display-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" variant="outline" disabled={!changed || save.isPending}>
        Save
      </Button>
    </form>
  );
};

export default DisplayName;
