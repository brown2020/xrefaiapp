import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

type Side = "right" | "left";

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  );
}

export function SheetTrigger({ children }: { children: ReactNode }) {
  return <Dialog.Trigger asChild>{children}</Dialog.Trigger>;
}

export function SheetClose({ children }: { children: ReactNode }) {
  return <Dialog.Close asChild>{children}</Dialog.Close>;
}

export function SheetContent({
  title,
  side = "right",
  className,
  children,
}: {
  title: string;
  side?: Side;
  className?: string;
  children: ReactNode;
}) {
  const sideClasses =
    side === "right"
      ? "right-0 data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full"
      : "left-0 data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full";
  const borderSide = side === "right" ? "border-l" : "border-r";

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-20000 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <Dialog.Content
        className={cn(
          "fixed top-0 z-20000 h-dvh w-[280px] max-w-[85vw] bg-card text-card-foreground border-border shadow-xl outline-none",
          borderSide,
          "transition-transform duration-200 ease-out",
          sideClasses,
          className
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <Dialog.Title className="font-semibold text-foreground">
            {title}
          </Dialog.Title>
          <Dialog.Close asChild>
            <button
              type="button"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </div>

        <div className="p-2">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

