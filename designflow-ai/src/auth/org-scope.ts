import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/db/client";

export class UnauthenticatedError extends Error {
  constructor() {
    super("No signed-in user.");
    this.name = "UnauthenticatedError";
  }
}

export class NoOrganizationError extends Error {
  constructor() {
    super("This account isn't attached to an organization yet.");
    this.name = "NoOrganizationError";
  }
}

/**
 * The single source of truth for "which organization is this request
 * allowed to touch." Every service function that reads or writes
 * organization-scoped data should receive its `organizationId` from here —
 * never from a client-supplied value — so cross-tenant access is a type
 * error, not a runtime bug waiting to happen.
 *
 * This tool runs as a single agency, so in practice there is exactly one
 * Organization row. The first person who signs in becomes its ADMIN member
 * (see /src/actions/auth.ts for that bootstrap logic); everyone after that
 * is added by an admin.
 *
 * Usage inside a Server Action or Route Handler:
 *   const { organizationId, member } = await requireOrgScope();
 */
export async function requireOrgScope() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthenticatedError();

  const member = await prisma.member.findUnique({
    where: { supabaseUserId: user.id },
    include: { organization: true },
  });

  if (!member) throw new NoOrganizationError();

  return {
    organizationId: member.organizationId,
    organization: member.organization,
    member,
  };
}
