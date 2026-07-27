import { notFound } from "next/navigation";
import { prisma } from "@/db/client";
import { ContentForm } from "./content-form";

export default async function RequestContentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { template: { include: { slots: { orderBy: [{ slideIndex: "asc" }, { order: "asc" }] } } } },
  });

  if (!project || !project.template) notFound();

  const slidesMap = new Map<number, typeof project.template.slots>();
  for (const slot of project.template.slots) {
    const list = slidesMap.get(slot.slideIndex) ?? [];
    list.push(slot);
    slidesMap.set(slot.slideIndex, list);
  }
  const slides = Array.from(slidesMap.entries()).sort(([a], [b]) => a - b);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-xl font-medium">Add your content</h1>
        <p className="text-sm text-muted-foreground">
          Fill in each slide for &quot;{project.name}&quot;. For images, paste a link to the image
          for now.
        </p>
      </div>
      <ContentForm projectId={project.id} slides={slides} />
    </main>
  );
}
