import { requireOrgScope } from "@/auth/org-scope";
import { prisma } from "@/db/client";
import { PluginTokenPanel } from "./plugin-token-panel";
import { NotificationRouteForm } from "./notification-route-form";

export default async function SettingsPage() {
  const { organizationId } = await requireOrgScope();

  const hasPluginToken = await prisma.apiKeyConfig.findUnique({
    where: { organizationId_provider: { organizationId, provider: "FIGMA_PLUGIN" } },
  });

  const route = await prisma.notificationRoute.findFirst({
    where: { organizationId, layoutType: null },
  });

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <div>
        <h1 className="text-xl font-medium">Settings</h1>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Figma plugin connection</h2>
        <p className="text-sm text-muted-foreground">
          Generate a token, then paste it into the DesignFlow AI plugin inside Figma. Generating
          a new one disconnects the old one.
        </p>
        <PluginTokenPanel hasExistingToken={!!hasPluginToken} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Where new requests get announced. Applies to all request types unless you add a
          type-specific route later.
        </p>
        <NotificationRouteForm
          defaultEmails={route?.notifyEmails.join(", ") ?? ""}
          defaultAsanaProjectGid={route?.asanaProjectGid ?? ""}
        />
      </section>
    </div>
  );
}
