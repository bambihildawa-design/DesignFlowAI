"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/db/client";

/**
 * Runs once per session on the dashboard layout. If the signed-in Supabase
 * user has no Member row yet, this creates one — and, since this is a
 * single-agency deployment, creates the one Organization too if it doesn't
 * exist yet. The very first person to ever sign in becomes ADMIN; everyone
 * after that joins as DESIGNER (an admin can promote them later from
 * Settings → Team, once that screen exists).
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

  const isFirstMember = (await prisma.member.count({ where: { organizationId: organization.id } })) === 0;

  return prisma.member.create({
    data: {
      supabaseUserId: user.id,
      organizationId: organization.id,
      name: (user.user_metadata?.name as string | undefined) ?? user.email ?? "Team member",
      email: user.email ?? "",
      role: isFirstMember ? "ADMIN" : "DESIGNER",
    },
  });
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
