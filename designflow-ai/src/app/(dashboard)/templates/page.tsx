import { requireOrgScope } from "@/auth/org-scope";
import { prisma } from "@/db/client";
import { NewTemplateForm } from "./new-template-form";
import { SlotEditor } from "./slot-editor";

export default async function TemplatesPage() {
  const { organizationId } = await requireOrgScope();

  const templates = await prisma.template.findMany({
    where: { organizationId },
    include: { slots: { orderBy: [{ slideIndex: "asc" }, { order: "asc" }] } },
    orderBy: { lastSyncedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-medium">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Register each carousel template from your Figma file, then tag which layer is which
          slide field. Layer names must match exactly what&apos;s in Figma — that&apos;s how the
          plugin finds them later.
        </p>
      </div>

      <NewTemplateForm />

      <div className="flex flex-col gap-4">
        {templates.map((template) => (
          <div key={template.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-muted-foreground">
                  {template.figmaFileKey} · node {template.figmaNodeId} ·{" "}
                  {template.isCurated ? "shown to requesters" : "hidden"}
                </div>
              </div>
            </div>
            <SlotEditor templateId={template.id} slots={template.slots} slideCount={template.slideCount ?? 1} />
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground">No templates yet — add the first one above.</p>
        )}
      </div>
    </div>
  );
}
