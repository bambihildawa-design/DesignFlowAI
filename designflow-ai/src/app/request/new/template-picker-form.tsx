"use client";

import { useState } from "react";
import { startRequest } from "@/actions/requests";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TemplateOption {
  id: string;
  name: string;
  slideCount: number;
}

export function TemplatePickerForm({ templates }: { templates: TemplateOption[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (!selectedId) return;
    setSubmitting(true);
    await startRequest({
      templateId: selectedId,
      requesterName: String(formData.get("requesterName")),
      requesterEmail: String(formData.get("requesterEmail")),
      projectName: String(formData.get("projectName")),
    });
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates are available yet — check back soon.
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              selectedId === t.id ? "border-accent bg-accent/5" : "border-border bg-surface hover:bg-muted"
            )}
          >
            <div className="font-medium">{t.name}</div>
            <div className="text-xs text-muted-foreground">{t.slideCount} slides</div>
          </button>
        ))}
      </div>

      {selectedId && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <label className="flex flex-col gap-1 text-sm">
            Request name
            <input name="projectName" required placeholder="e.g. August product launch" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Your name
            <input name="requesterName" required className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Your email
            <input name="requesterEmail" type="email" required className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </label>
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? "Starting…" : "Continue"}
          </Button>
        </div>
      )}
    </form>
  );
}
