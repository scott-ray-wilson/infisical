import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { listSecretSyncsByProjectId, secretSyncKeys } from "@app/hooks/api/secretSyncs";
import { IntegrationsListPageTabs } from "@app/types/integrations";

import { IntegrationsListPage } from "./IntegrationsListPage";

const IntegrationsListPageQuerySchema = z.object({
  selectedTab: z.nativeEnum(IntegrationsListPageTabs).catch(IntegrationsListPageTabs.SecretSyncs)
});

export const Route = createFileRoute(
  "/_authenticate/_inject-org-details/_org-layout/secret-manager/$projectId/_secret-manager-layout/integrations/"
)({
  component: IntegrationsListPage,
  validateSearch: zodValidator(IntegrationsListPageQuerySchema),
  beforeLoad: async ({ context, search, params }) => {
    if (!search.selectedTab) {
      const secretSyncs = await context.queryClient.ensureQueryData({
        queryKey: secretSyncKeys.list(params.projectId),
        queryFn: () => listSecretSyncsByProjectId(params.projectId)
      });

      if (secretSyncs.length) {
        throw redirect({
          to: "/organization/app-connections",
          search: { selectedTab: IntegrationsListPageTabs.SecretSyncs }
        });
      }

      throw redirect({
        to: "/organization/app-connections",
        search: { selectedTab: IntegrationsListPageTabs.NativeIntegrations }
      });
    }

    return {
      breadcrumbs: [
        ...context.breadcrumbs,
        {
          label: "Integrations"
        }
      ]
    };
  }
});
