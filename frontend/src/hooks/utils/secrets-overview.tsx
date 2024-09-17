import { useCallback, useMemo } from "react";

import { DashboardProjectSecretsOverview } from "@app/hooks/api/dashboard/types";
import { OrderByDirection } from "@app/hooks/api/generic/types";

export const useFolderOverview = (
  folders: DashboardProjectSecretsOverview["folders"],
  orderDirection: OrderByDirection
) => {
  const folderNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(folders ?? {})?.forEach((folderGroup) => {
      folderGroup.forEach((folder) => {
        names.add(folder.name);
      });
    });
    return [...names].sort((a, b) =>
      orderDirection === OrderByDirection.ASC ? a.localeCompare(b) : b.localeCompare(a)
    );
  }, [folders]);

  const isFolderPresentInEnv = useCallback(
    (name: string, env: string) => {
      return Boolean(folders?.[env]?.find(({ name: folderName }) => folderName === name));
    },
    [folders]
  );

  const getFolderByNameAndEnv = useCallback(
    (name: string, env: string) => {
      return folders?.[env]?.find(({ name: folderName }) => folderName === name);
    },
    [folders]
  );

  return { folderNames, isFolderPresentInEnv, getFolderByNameAndEnv };
};
