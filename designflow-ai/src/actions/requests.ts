"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/db/client";
import { getDefaultOrganization } from "@/auth/public-org";

export async function startRequest(input: {
  templateId: string;
  requesterName: string;
  requesterEmail: string;
  projectName: string;
}) {
  const organization = await getDefaultOrganization();

  const project = await prisma.project.create({
    data: {
      organizationId: organization.id,
      name: input.projectName,
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      templateId: input.templateId,
      layoutType: "CAROUSEL",
      status: "TEMPLATE_SELECTED",
    },
  });

  redirect(`/request/${project.id}/content`);
}

export async function submitRequestContent(
  projectId: string,
  answers: { slotId: string; textValue?: string; imageUrl?: string }[]
) {
  await prisma.$transaction([
    ...answers.map((a) =>
      prisma.slotAnswer.upsert({
        where: { projectId_slotId: { projectId, slotId: a.slotId } },
        update: { textValue: a.textValue ?? null, imageUrl: a.imageUrl ?? null },
        create: {
          projectId,
          slotId: a.slotId,
          textValue: a.textValue ?? null,
          imageUrl: a.imageUrl ?? null,
        },
      })
    ),
    prisma.project.update({ where: { id: projectId }, data: { status: "CONTENT_SUBMITTED" } }),
  ]);

  redirect(`/r/${projectId}`);
}
