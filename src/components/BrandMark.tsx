import { Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

/** Footprints in a coral tile: the one walking motif used across the app. */
const BrandMark = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30",
      className,
    )}
    aria-hidden
  >
    <Footprints className="h-5 w-5" />
  </span>
);

export default BrandMark;
