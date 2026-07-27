import { NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { verifyPluginToken } from "@/auth/plugin-token";

/**
 * Called by the Figma plugin (running inside Figma, on the SOC-MED file)
 * to list requests that have their content filled in and are waiting to
 * be applied. The plugin can only duplicate/edit layers in the file it's
 * currently open in, so this only ever needs to return requests for
 * templates in that same file — which, for now, is all of them.
 */
export async function GET(request: Request) {
  const auth = await verifyPluginToken(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing plugin token." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      organizationId: auth.organizationId,
      status: "CONTENT_SUBMITTED",
    },
    include: {
      template: true,
      slotAnswers: { include: { slot: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    requests: projects.map((p) => ({
      id: p.id,
      name: p.name,
      requesterName: p.requesterName,
      figmaFileKey: p.template?.figmaFileKey,
      templateName: p.template?.name,
      templateNodeId: p.template?.figmaNodeId,
      slides: groupBySlide(p.slotAnswers),
    })),
  });
}

function groupBySlide(
  answers: { slot: { slideIndex: number; layerName: string; slotType: string }; textValue: string | null; imageUrl: string | null }[]
) {
  const bySlide = new Map<number, { layerName: string; slotType: string; value: string | null }[]>();
  for (const a of answers) {
    const list = bySlide.get(a.slot.slideIndex) ?? [];
    list.push({
      layerName: a.slot.layerName,
      slotType: a.slot.slotType,
      value: a.slot.slotType === "IMAGE" ? a.imageUrl : a.textValue,
    });
    bySlide.set(a.slot.slideIndex, list);
  }
  return Array.from(bySlide.entries())
    .sort(([a], [b]) => a - b)
    .map(([slideIndex, fields]) => ({ slideIndex, fields }));
}
