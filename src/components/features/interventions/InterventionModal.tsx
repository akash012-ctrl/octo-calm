"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "./ProgressBar";
import { cn } from "@/lib/utils";

interface InterventionModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  currentStep?: number;
  totalSteps?: number;
  onClose: () => void;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  statusLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

function useEscapeToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);
}

function renderProgress(
  currentStep?: number,
  totalSteps?: number,
  statusLabel?: string
) {
  if (currentStep === undefined || totalSteps === undefined) return null;

  return (
    <div className="border-b bg-muted/10 p-4">
      <ProgressBar
        value={currentStep}
        max={totalSteps}
        label={statusLabel ?? "Session progress"}
      />
    </div>
  );
}

export function InterventionModal(props: InterventionModalProps) {
  const {
    open,
    title,
    subtitle,
    currentStep,
    totalSteps,
    onClose,
    onNext,
    onBack,
    onSkip,
    statusLabel,
    children,
    footer,
    className,
  } = props;

  useEscapeToClose(open, onClose);

  if (typeof window === "undefined" || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <Card
        className={cn(
          "relative max-h-[90vh] w-full max-w-2xl overflow-hidden",
          className
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between border-b bg-muted/30">
          <div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </CardHeader>

        {renderProgress(currentStep, totalSteps, statusLabel)}

        <CardContent className="max-h-[55vh] overflow-y-auto p-6">
          {children}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                Back
              </Button>
            )}
            {onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {footer}
            {onNext && (
              <Button variant="default" size="sm" onClick={onNext}>
                Next step
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
}
