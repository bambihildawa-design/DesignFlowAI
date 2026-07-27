"use client";

import { useState } from "react";
import { submitRequestContent } from "@/actions/requests";
import { Button } from "@/components/ui/button";

interface Slot {
  id: string;
  slideIndex: number;
  slotType: string;
  label: string;
}

export function ContentForm({
  projectId,
  slides,
}: {
  projectId: string;
  slides: [number, Slot[]][];
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const answers = slides.flatMap(([, slots]) =>
      slots.map((slot) => ({
        slotId: slot.id,
        textValue: slot.slotType === "TEXT" ? String(formData.get(slot.id) ?? "") : undefined,
        imageUrl: slot.slotType === "IMAGE" ? String(formData.get(slot.id) ?? "") : undefined,
      }))
    );
    await submitRequestContent(projectId, answers);
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {slides.map(([slideIndex, slots]) => (
        <div key={slideIndex} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="text-sm font-medium">Slide {slideIndex + 1}</div>
          {slots.map((slot) => (
            <label key={slot.id} className="flex flex-col gap-1 text-sm">
              {slot.label}
              {slot.slotType === "TEXT" ? (
                <textarea
                  name={slot.id}
                  required
                  rows={2}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              ) : (
                <input
                  name={slot.id}
                  type="url"
                  required
                  placeholder="https://…"
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                />
              )}
            </label>
          ))}
        </div>
      ))}
      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
