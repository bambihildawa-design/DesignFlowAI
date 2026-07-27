"use client";

import { useState } from "react";
import { regeneratePluginToken } from "@/actions/settings";
import { Button } from "@/components/ui/button";

export function PluginTokenPanel({ hasExistingToken }: { hasExistingToken: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const newToken = await regeneratePluginToken();
    setToken(newToken);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      {token ? (
        <>
          <p className="text-xs text-muted-foreground">
            Copy this now — it won&apos;t be shown again. Paste it into the plugin&apos;s connection
            screen inside Figma, along with this site&apos;s address.
          </p>
          <code className="break-all rounded-md bg-muted px-3 py-2 text-xs">{token}</code>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {hasExistingToken ? "A token already exists." : "No token yet."} Generating a new one
          will disconnect the plugin until you paste the new one in.
        </p>
      )}
      <Button onClick={handleGenerate} disabled={loading} className="self-start">
        {loading ? "Generating…" : hasExistingToken ? "Generate new token" : "Generate token"}
      </Button>
    </div>
  );
}
