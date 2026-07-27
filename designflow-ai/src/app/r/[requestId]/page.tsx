import { notFound } from "next/navigation";
import { prisma } from "@/db/client";

const STATUS_COPY: Record<string, string> = {
  INTAKE: "Just getting started.",
  TEMPLATE_SELECTED: "Template picked — waiting on your slide content.",
  CONTENT_SUBMITTED: "Submitted. Someone on the team will apply it in Figma shortly.",
  PUSHED_TO_FIGMA: "Your design is in Figma and being reviewed.",
  APPROVED: "Approved.",
  COMPLETED: "Complete.",
};

export default async function RequestStatusPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const project = await prisma.project.findUnique({ where: { id: requestId } });

  if (!project) notFound();

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
      <h1 className="text-lg font-medium">{project.name}</h1>
      <p className="text-sm text-muted-foreground">
        {STATUS_COPY[project.status] ?? "In progress."}
      </p>
    </main>
  );
}
