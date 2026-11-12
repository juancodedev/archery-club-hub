import { RING_CELL_CLASSES } from "@/lib/ringCells";
import { ringFace } from "@/lib/scoringUtils";
import { cn } from "@/lib/utils";

interface RingCellProps {
  ifaaRound: string | null | undefined;
  value: string;
  className?: string;
}

/** One recorded arrow, painted like the ring of the IFAA face it hit. */
export default function RingCell({ ifaaRound, value, className }: RingCellProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 font-display text-sm font-bold",
        RING_CELL_CLASSES[ringFace(ifaaRound, value)],
        className,
      )}
    >
      {value || "—"}
    </span>
  );
}
