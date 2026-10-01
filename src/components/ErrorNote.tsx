import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Quiet inline error with an optional retry, used instead of toasts. */
const ErrorNote = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div
    role="alert"
    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
  >
    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
    <span className="min-w-0 flex-1">{message}</span>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="h-11 sm:h-9">
        <RotateCw aria-hidden /> Try again
      </Button>
    )}
  </div>
);

export default ErrorNote;
