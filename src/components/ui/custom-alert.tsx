"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "success" | "error" | "warning" | "info";

interface CustomAlertProps {
  variant?: AlertVariant;
  title?: string;
  description?: string;
  /** "inline" = minimal, Google-style form error (no box). "default" = full alert card. */
  appearance?: "default" | "inline";
  /** When provided, component is controlled. When undefined, uses internal visibility state. */
  visible?: boolean;
  /** When false, hides the dismiss button. Useful for form validation errors that clear on input change. */
  dismissible?: boolean;
  /** Called when user clicks dismiss. Parent should clear error/update state when controlled. */
  onDismiss?: () => void;
  className?: string;
}

const icons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-6 w-6" />,
  error: <X className="h-6 w-6" />,
  warning: <AlertTriangle className="h-6 w-6" />,
  info: <Info className="h-6 w-6" />,
};

const inlineIcons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />,
  error: <X className="h-3.5 w-3.5 shrink-0" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
  info: <Info className="h-3.5 w-3.5 shrink-0" />,
};

const variantStyles: Record<AlertVariant, string> = {
  success:
    "bg-[color:rgba(37,201,114,0.10)] border-[color:rgba(37,201,114,0.20)] [&>div>div:first-child]:text-[var(--color-success)]",
  error:
    "bg-[color:rgba(255,82,82,0.10)] border-[color:rgba(255,82,82,0.20)] [&>div>div:first-child]:text-[var(--color-error)]",
  warning:
    "bg-[color:rgba(255,138,30,0.10)] border-[color:rgba(255,138,30,0.20)] [&>div>div:first-child]:text-[var(--color-warning)]",
  info:
    "bg-[color:rgba(13,148,136,0.10)] border-[color:rgba(13,148,136,0.20)] [&>div>div:first-child]:text-[var(--color-info)]",
};

const inlineVariantStyles: Record<AlertVariant, string> = {
  success: "text-[var(--color-success)] [&>div>div:first-child]:text-[var(--color-success)]",
  error: "text-[var(--color-error)] [&>div>div:first-child]:text-[var(--color-error)]",
  warning: "text-[var(--color-warning)] [&>div>div:first-child]:text-[var(--color-warning)]",
  info: "text-[var(--color-info)] [&>div>div:first-child]:text-[var(--color-info)]",
};

export default function CustomAlert({
  variant = "success",
  title = "Default Alert Title",
  description = "This is a default description for the alert. You can customize this text by passing props.",
  appearance = "default",
  visible: controlledVisible,
  dismissible = true,
  onDismiss,
  className,
}: CustomAlertProps) {
  const [internalVisible, setInternalVisible] = useState(true);

  const isControlled = controlledVisible !== undefined;
  const visible = isControlled ? controlledVisible : internalVisible;

  const handleDismiss = () => {
    if (isControlled) {
      onDismiss?.();
    } else {
      setInternalVisible(false);
    }
  };

  if (appearance === "inline") {
    return (
      <AnimatePresence>
        {visible && description && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center gap-1.5 pt-1.5",
              inlineVariantStyles[variant],
              className
            )}
          >
            <div className="shrink-0">{inlineIcons[variant]}</div>
            <p className="text-xs leading-tight">{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "relative w-full p-4 rounded-2xl shadow-lg border backdrop-blur-md",
            "border-white/20 dark:border-white/10",
            "text-white",
            variantStyles[variant],
            className
          )}
        >
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-3 right-3 rounded-full p-1 hover:bg-white/20 transition"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-start gap-3">
            <div className="shrink-0 font-normal">{icons[variant]}</div>
            <div className="flex flex-col">
              {title && (
                <h4 className="text-base font-semibold">{title}</h4>
              )}
              {description && (
                <p className={cn(
                  "text-sm opacity-90",
                  title && "mt-1"
                )}>
                  {description}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
