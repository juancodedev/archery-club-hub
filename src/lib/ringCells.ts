import type { RingFace } from "./scoringUtils";

/**
 * Tailwind classes for a score cell or keypad key painted like the ring it stands for.
 * Black and navy cells get a light border in dark mode so they stay visible on a dark page.
 */
export const RING_CELL_CLASSES: Record<RingFace, string> = {
    black: "bg-ifaa-black text-ifaa-white border-ifaa-black dark:border-white/50",
    white: "bg-ifaa-white text-ifaa-black border-ifaa-black",
    navy: "bg-ifaa-navy text-ifaa-white border-ifaa-navy dark:border-white/50",
    miss: "bg-muted text-muted-foreground border-muted-foreground/40",
    neutral: "bg-card text-foreground border-muted-foreground",
    empty: "bg-card text-muted-foreground border-dashed border-border",
};
