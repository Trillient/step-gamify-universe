import { Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

/** Footprints in a soft green tile: the one walking motif used across the app. */
const BrandMark = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground",
      className,
    )}
    aria-hidden
  >
    <Footprints className="h-5 w-5" />
  </span>
);

export default BrandMark;
