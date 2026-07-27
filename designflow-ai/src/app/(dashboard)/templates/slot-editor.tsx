"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTemplateSlot, deleteTemplateSlot } from "@/actions/templates";
import { Button } from "@/components/ui/button";

interface Slot {
  id: string;
  slideIndex: number;
  slotType: string;
  layerName: string;
  label: string;
  order: number;
}

export function SlotEditor({
  templateId,
  slots,
  slideCount,
}: {
  templateId: string;
  slots: Slot[];
  slideCount: number;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function handleAdd(formData: FormData) {
    await addTemplateSlot({
      templateId,
      slideIndex: Number(formData.get("slideIndex")),
      slotType: formData.get("slotType") as "TEXT" | "IMAGE",
      layerName: String(formData.get("layerName")),
      label: String(formData.get("label")),
      order: Number(formData.get("order") ?? 0),
    });
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {Array.from({ length: slideCount }, (_, i) => i).map((slideIndex) => {
        const slideSlots = slots.filter((s) => s.slideIndex === slideIndex);
        return (
          <div key={slideIndex} className="rounded-lg border border-border/60 p-2">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Slide {slideIndex + 1}</div>
            <div className="flex flex-col gap-1">
              {slideSlots.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span>
                    <span className="text-muted-foreground">[{s.slotType}]</span> {s.label} →{" "}
                    <code className="font-mono">{s.layerName}</code>
                  </span>
                  <button
                    className="text-danger"
                    onClick={async () => {
                      await deleteTemplateSlot(s.id);
                      router.refresh();
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {slideSlots.length === 0 && (
                <p className="text-xs text-muted-foreground">No fields tagged for this slide yet.</p>
              )}
            </div>
            <form
              action={(fd) => {
                fd.set("slideIndex", String(slideIndex));
                return handleAdd(fd);
              }}
              className="mt-2 flex flex-wrap items-end gap-2"
            >
              <select name="slotType" className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                <option value="TEXT">Text</option>
                <option value="IMAGE">Image</option>
              </select>
              <input name="label" placeholder="Label shown to requester (e.g. Headline)" required className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs" />
              <input name="layerName" placeholder="Exact Figma layer name" required className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs font-mono" />
              <input name="order" type="number" defaultValue={0} className="h-8 w-14 rounded-md border border-border bg-background px-2 text-xs" />
              <Button type="submit" size="sm" variant="outline">Add field</Button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
