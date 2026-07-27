import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { verifyPluginToken } from "@/auth/plugin-token";
import { sendRequestNotificationEmail } from "@/integrations/resend/send-request-notification";
import { createAsanaTask } from "@/integrations/asana/create-task";

const bodySchema = z.object({
  projectId: z.string(),
  newFigmaNodeId: z.string(), // the id of the duplicated frame, for the preview link
});

export async function POST(request: Request) {
  const auth = await verifyPluginToken(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing plugin token." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, organizationId: auth.organizationId },
    include: { template: true },
  });

  if (!project || !project.template) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const design = await prisma.design.create({
    data: {
      projectId: project.id,
      templateId: project.template.id,
      figmaFileKey: project.template.figmaFileKey,
      figmaNodeId: parsed.data.newFigmaNodeId,
      status: "READY_FOR_REVIEW",
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { status: "PUSHED_TO_FIGMA" },
  });

  const figmaLink = `https://www.figma.com/design/${project.template.figmaFileKey}?node-id=${parsed.data.newFigmaNodeId}`;

  const route = await prisma.notificationRoute.findFirst({
    where: {
      organizationId: auth.organizationId,
      OR: [{ layoutType: project.layoutType }, { layoutType: null }],
    },
    orderBy: { layoutType: "desc" }, // a specific layoutType match wins over the null fallback
  });

  // Both notifications are best-effort — a failure here shouldn't undo the
  // successful Figma push, so each is caught independently.
  await Promise.allSettled([
    route?.notifyEmails.length
      ? sendRequestNotificationEmail({
          to: route.notifyEmails,
          projectName: project.name,
          requesterName: project.requesterName ?? "Someone",
          figmaLink,
        })
      : Promise.resolve(),
    route?.asanaProjectGid
      ? createAsanaTask({
          projectGid: route.asanaProjectGid,
          title: `New carousel request: ${project.name}`,
          notes: `Requested by ${project.requesterName ?? "unknown"}.\n\nReview in Figma: ${figmaLink}`,
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ designId: design.id, figmaLink });
}
