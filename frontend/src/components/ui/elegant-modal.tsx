import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ElegantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Max width class — default "max-w-lg" */
  maxWidth?: string;
  /** Title for aria-labelledby — rendered in header if showHeader=true */
  title?: string;
  /** Show default header with title + close button */
  showHeader?: boolean;
  className?: string;
}

export function ElegantModal({
  open,
  onOpenChange,
  children,
  maxWidth = "max-w-lg",
  title,
  showHeader = false,
  className,
}: ElegantModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-border bg-card shadow-xl",
            "max-h-[90vh] flex flex-col overflow-y-auto",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "focus-visible:outline-none",
            maxWidth,
            className,
          )}
        >
          {showHeader && title && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <Dialog.Title className="text-sm font-semibold text-foreground">
                {title}
              </Dialog.Title>
              <Dialog.Close className="rounded-[10px] p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <X size={16} />
                <span className="sr-only">Cerrar</span>
              </Dialog.Close>
            </div>
          )}
          {!showHeader && title && (
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;
export const ModalClose = Dialog.Close;
