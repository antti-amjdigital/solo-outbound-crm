/** Shared class fragments for the sequence editor (spec: indigo focus rings everywhere). */
export const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-stats-indigo-700/30"

/** 36px bordered control used across the edit row. */
export const editControl =
  "h-9 rounded-lg border border-stats-picker-line bg-white text-[13px] text-seq-name-ink"

/** Secondary button: white, #e2e8f0 border, slate text. */
export const secondaryButton =
  "inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg border border-stats-picker-line bg-white px-4 text-sm font-semibold text-seq-button-ink hover:bg-stats-canvas disabled:pointer-events-none disabled:opacity-50"

/** Primary button: solid indigo. */
export const primaryButton =
  "inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-stats-indigo-700 px-[18px] text-sm font-semibold text-white hover:bg-stats-indigo-900 disabled:pointer-events-none disabled:opacity-50"
