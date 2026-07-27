"use server";

import { revalidatePath } from "next/cache";
import { requireOrgScope } from "@/auth/org-scope";
import { prisma } from "@/db/client";

export async function createTemplate(input: {
  name: string;
  figmaFileKey: string;
  figmaNodeId: string;
  slideCount: number;
  isCurated: boolean;
}) {
  const { organizationId } = await requireOrgScope();

  const template = await prisma.template.create({
    data: { organizationId, ...input, category: "CAROUSEL" },
  });

  revalidatePath("/templates");
  return template;
}

export async function addTemplateSlot(input: {
  templateId: string;
  slideIndex: number;
  slotType: "TEXT" | "IMAGE";
  layerName: string;
  label: string;
  order: number;
}) {
  await requireOrgScope();
  const slot = await prisma.templateSlot.create({ data: input });
  revalidatePath("/templates");
  return slot;
}

export async function deleteTemplateSlot(slotId: string) {
  await requireOrgScope();
  await prisma.templateSlot.delete({ where: { id: slotId } });
  revalidatePath("/templates");
}
