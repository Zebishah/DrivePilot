import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type AdminModalSize = "sm" | "md" | "lg" | "xl";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: AdminModalSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

export function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusRef,
  className = "",
}: AdminModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = `admin-modal-title-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const focusInitialElement = () => {
      const explicitTarget = initialFocusRef?.current;
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (explicitTarget || firstFocusable || dialogRef.current)?.focus();
    };

    const frame = window.requestAnimationFrame(focusInitialElement);
    return () => {
      window.cancelAnimationFrame(frame);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      previousFocusRef.current?.focus?.();
    };
  }, [initialFocusRef, open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="dsp-admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`dsp-admin-modal dsp-admin-modal--${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dsp-admin-modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="dsp-admin-modal__close" aria-label={`Close ${title}`} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="dsp-admin-modal__body">{children}</div>
        {footer && <footer className="dsp-admin-modal__footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

export function AdminModalSection({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`dsp-admin-modal-section ${className}`.trim()}>{title && <h3>{title}</h3>}{children}</section>;
}

export function AdminDetailGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`dsp-admin-detail-grid--modal ${className}`.trim()}>{children}</div>;
}

export function AdminDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="dsp-admin-detail-row"><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>;
}
