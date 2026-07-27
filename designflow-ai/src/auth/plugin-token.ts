import "server-only";
import { prisma } from "@/db/client";
import { createHash } from "node:crypto";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The Figma plugin runs inside Figma, not in a browser session — it has no
 * Supabase cookie to prove who it is. Instead, an admin generates a plugin
 * token once (Settings → Figma Plugin) and pastes it into the plugin's
 * settings panel. Every plugin request sends it as a Bearer token; this
 * checks it against the stored (hashed — never plaintext) value.
 */
export async function verifyPluginToken(authHeader: string | null) {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const hashed = hashToken(token);
  const config = await prisma.apiKeyConfig.findFirst({
    where: { provider: "FIGMA_PLUGIN", encryptedKey: hashed },
  });

  return config ? { organizationId: config.organizationId } : null;
}

export function generatePluginToken() {
  const token = crypto.randomUUID().replace(/-/g, "");
  return { token, hashed: hashToken(token) };
}
