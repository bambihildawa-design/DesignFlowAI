"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTemplate } from "@/actions/templates";
import { Button } from "@/components/ui/button";

export function NewTemplateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await createTemplate({
      name: String(formData.get("name")),
      figmaFileKey: String(formData.get("figmaFileKey")),
      figmaNodeId: String(formData.get("figmaNodeId")),
      slideCount: Number(formData.get("slideCount")),
      isCurated: formData.get("isCurated") === "on",
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="self-start">
        Add template
      </Button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Template name
          <input name="name" required className="h-9 rounded-md border border-border bg-background px-3 text-sm" placeholder="4-slide announcement" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Number of slides
          <input name="slideCount" type="number" min={1} required className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Figma file key
          <input name="figmaFileKey" required defaultValue="nUa35AhgRB2r7adG3aN4BP" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Figma frame node id
          <input name="figmaNodeId" required placeholder="2768:386" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isCurated" defaultChecked />
        Show to requesters
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save template"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
