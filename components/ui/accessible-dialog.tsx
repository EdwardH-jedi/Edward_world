"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

interface AccessibleDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogFocusOptions<T extends HTMLElement> {
  active?: boolean;
  containerRef: RefObject<T | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/** Shared focus lifecycle for dialogs that need to keep their own visual shell. */
export function useDialogFocus<T extends HTMLElement>({
  active = true,
  containerRef,
  initialFocusRef,
  onClose,
  returnFocusRef,
}: DialogFocusOptions<T>) {
  useEffect(() => {
    if (!active) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const returnFocus = returnFocusRef?.current ?? previousFocus;
    const dialog = containerRef.current;
    (initialFocusRef?.current ?? dialog)?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (!dialog.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (current === first || current === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || current === dialog)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocus?.focus({ preventScroll: true });
    };
  }, [active, containerRef, initialFocusRef, onClose, returnFocusRef]);
}

export function AccessibleDialog({
  title,
  onClose,
  children,
  className = "",
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ containerRef: dialogRef, onClose });

  return (
    <div className="overlay-backdrop" role="presentation">
      <div
        aria-labelledby="dialog-title"
        aria-modal="true"
        className={`dialog ${className}`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="dialog__header">
          <h2 id="dialog-title">{title}</h2>
          <button aria-label={`Close ${title}`} onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
