import "server-only";
import { prisma } from "@/db/client";

/**
 * The public requester flow (§8.3) has no signed-in session, so it can't go
 * through requireOrgScope(). For a single-agency deployment there's only
 * ever one Organization row, so we resolve it directly.
 *
 * If DesignFlow AI ever needs to serve multiple agencies from one
 * deployment, this is the one place that changes: swap the lookup for a
 * slug in the request path (e.g. /request/[orgSlug]/new) instead of
 * "the only org that exists."
 */
export async function getDefaultOrganization() {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!organization) {
    throw new Error(
      "No organization exists yet. It's created automatically the first time someone signs up on /sign-up."
    );
  }

  return organization;
}
