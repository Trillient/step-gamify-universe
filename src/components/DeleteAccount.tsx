import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** In-app account deletion: removes your name and every step entry from the server. */
const DeleteAccount = ({ beforeDelete }: { beforeDelete: () => Promise<void> }) => {
  const { user, getToken, reauthenticateForDeletion, forgetAccount, revokeAppleIfNeeded } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const isPasswordAccount = user?.providerData.some((provider) => provider.providerId === "password") ?? false;

  const remove = async () => {
    if (isPasswordAccount && !password) {
      setError("Enter your password to confirm account deletion.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await beforeDelete();
      // Apple sign-ins are revoked first; if that fails nothing is deleted and the user can retry.
      await revokeAppleIfNeeded();
      await reauthenticateForDeletion(password);
      const deletionToken = await getToken();
      if (!deletionToken) throw new Error("missing-deletion-token");
      await forgetAccount();
      // Firebase deletion is the irreversible identity step. Keep using the short-lived token
      // captured above for the idempotent server cleanup after it succeeds.
      await api.deleteMe(() => Promise.resolve(deletionToken));
    } catch {
      setError("Could not delete your account. Check your connection, confirm with Apple if asked, and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold text-destructive transition-transform hover:bg-destructive/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
            Delete my account
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your name and every step total you've logged, and takes you off the leaderboard. It can't be
              undone. You can sign in again later to start fresh.
            </AlertDialogDescription>
            {isPasswordAccount && (
              <label className="block space-y-1.5 text-left text-sm font-bold" htmlFor="delete-account-password">
                Password
                <input
                  id="delete-account-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border-2 bg-card px-3 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </label>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-2xl">Keep my account</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void remove()}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default DeleteAccount;
