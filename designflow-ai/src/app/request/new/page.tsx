import { getDefaultOrganization } from "@/auth/public-org";
import { prisma } from "@/db/client";
import { TemplatePickerForm } from "./template-picker-form";

export default async function NewRequestPage() {
  const organization = await getDefaultOrganization();

  const templates = await prisma.template.findMany({
    where: { organizationId: organization.id, isCurated: true, category: "CAROUSEL" },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-xl font-medium">New carousel request</h1>
        <p className="text-sm text-muted-foreground">Pick a template to get started.</p>
      </div>
      <TemplatePickerForm templates={templates.map((t) => ({ id: t.id, name: t.name, slideCount: t.slideCount ?? 1 }))} />
    </main>
  );
}
