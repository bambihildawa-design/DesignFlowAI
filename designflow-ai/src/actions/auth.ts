"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/db/client";

/**
 * Runs once per session on the dashboard layout. If the signed-in Supabase
 * user has no Member row yet, this creates one — and, since this is a
 * single-agency deployment, creates the one Organization too if it doesn't
 * exist yet. The very first person to ever sign in becomes ADMIN; everyone
 * after that joins as DESIGNER.
 *
 * Guarded against a race: if the page fires this twice nearly
 * simultaneously (common on first load), both calls might see "no member
 * yet" and both try to create one. Only one can succeed; the other catches
 * the resulting unique-constraint error and just re-fetches instead of
 * crashing.
 */
export async function bootstrapMembership() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const existing = await prisma.member.findUnique({ where: { supabaseUserId: user.id } });
  if (existing) return existing;

  const organization =
    (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.organization.create({ data: { name: "My Agency" } }));

  const isFirstMember =
    (await prisma.member.count({ where: { organizationId: organization.id } })) === 0;

  try {
    return await prisma.member.create({
      data: {
        supabaseUserId: user.id,
        organizationId: organization.id,
        name: (user.user_metadata?.name as string | undefined) ?? user.email ?? "Team member",
        email: user.email ?? "",
        role: isFirstMember ? "ADMIN" : "DESIGNER",
      },
    });
  } catch {
    const existingAfterRace = await prisma.member.findUnique({ where: { supabaseUserId: user.id } });
    if (existingAfterRace) return existingAfterRace;
    throw new Error("Failed to set up your account. Try refreshing the page.");
  }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
