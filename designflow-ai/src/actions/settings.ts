"use server";

import { revalidatePath } from "next/cache";
import { requireOrgScope } from "@/auth/org-scope";
import { prisma } from "@/db/client";
import { generatePluginToken } from "@/auth/plugin-token";

/**
 * Generates a fresh plugin token, replacing any previous one for this org.
 * Returns the plaintext token exactly once — only the hash is stored, so
 * there's no way to retrieve it again later (same pattern as an API key).
 */
export async function regeneratePluginToken() {
  const { organizationId } = await requireOrgScope();
  const { token, hashed } = generatePluginToken();

  await prisma.apiKeyConfig.upsert({
    where: { organizationId_provider: { organizationId, provider: "FIGMA_PLUGIN" } },
    update: { encryptedKey: hashed },
    create: { organizationId, provider: "FIGMA_PLUGIN", encryptedKey: hashed },
  });

  revalidatePath("/settings");
  return token;
}

export async function saveNotificationRoute(input: {
  layoutType: string | null;
  asanaProjectGid: string | null;
  notifyEmails: string[];
}) {
  const { organizationId } = await requireOrgScope();

  await prisma.notificationRoute.upsert({
    where: {
      organizationId_layoutType: {
        organizationId,
        layoutType: input.layoutType as never,
      },
    },
    update: {
      asanaProjectGid: input.asanaProjectGid,
      notifyEmails: input.notifyEmails,
    },
    create: {
      organizationId,
      layoutType: input.layoutType as never,
      asanaProjectGid: input.asanaProjectGid,
      notifyEmails: input.notifyEmails,
    },
  });

  revalidatePath("/settings");
}
