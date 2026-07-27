"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveNotificationRoute } from "@/actions/settings";
import { Button } from "@/components/ui/button";

export function NotificationRouteForm({
  defaultEmails,
  defaultAsanaProjectGid,
}: {
  defaultEmails: string;
  defaultAsanaProjectGid: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await saveNotificationRoute({
      layoutType: null,
      notifyEmails: String(formData.get("emails"))
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean),
      asanaProjectGid: String(formData.get("asanaProjectGid") || "") || null,
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-sm">
        Notify these emails (comma separated)
        <input
          name="emails"
          defaultValue={defaultEmails}
          placeholder="you@company.com, teammate@company.com"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Asana project ID
        <input
          name="asanaProjectGid"
          defaultValue={defaultAsanaProjectGid}
          placeholder="1234567890123456"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        />
      </label>
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
