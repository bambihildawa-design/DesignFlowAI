"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface WizardStep {
  id: string;
  label: string;
}

interface StepRailProps {
  steps: WizardStep[];
  currentStepId: string;
  completedStepIds: string[];
}

/**
 * The wizard's signature element: a vertical "thread" that runs behind each
 * step marker and fills with the accent color as steps complete. A request
 * moving through intake → content → Figma → notify is literally a thread
 * being pulled through — the rail makes that progression legible at a glance,
 * which numbered step trackers alone don't (this is a real sequence, so
 * numbering here is meaningful, not decorative).
 */
export function StepRail({ steps, currentStepId, completedStepIds }: StepRailProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <nav aria-label="Request progress" className="relative flex flex-col gap-0">
      {/* Background thread */}
      <div
        className="absolute left-[15px] top-4 bottom-4 w-px bg-border"
        aria-hidden="true"
      />
      {/* Filled thread, height driven by progress */}
      <div
        className="absolute left-[15px] top-4 w-px origin-top bg-accent transition-[height] duration-500 ease-out"
        style={{
          height:
            steps.length > 1
              ? `calc((100% - 2rem) * ${Math.max(currentIndex, 0)} / ${steps.length - 1})`
              : "0px",
        }}
        aria-hidden="true"
      />

      {steps.map((step, i) => {
        const isCompleted = completedStepIds.includes(step.id);
        const isCurrent = step.id === currentStepId;

        return (
          <div key={step.id} className="relative flex items-center gap-3 py-2.5">
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                isCompleted && "border-accent bg-accent text-accent-foreground",
                isCurrent && !isCompleted && "border-accent bg-surface text-accent",
                !isCompleted && !isCurrent && "border-border bg-surface text-muted-foreground"
              )}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-sm transition-colors",
                isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
