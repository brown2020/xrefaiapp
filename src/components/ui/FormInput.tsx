// Shared input styling classes
export const inputClassName =
  "mt-1 w-full p-3 rounded-md outline-none bg-card text-foreground border border-border font-normal placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-ring";

export const selectClassName = `${inputClassName} select-chevron`;

export const labelClassName = "text-foreground font-semibold";

export const cardClassName =
  "rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm";

export const primaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
