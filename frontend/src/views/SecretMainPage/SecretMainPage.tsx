import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/router";
import { subject } from "@casl/ability";
import {
  faArrowDown,
  faArrowUp,
  faFileImport,
  faFingerprint,
  faFolder,
  faKey
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import NavHeader from "@app/components/navigation/NavHeader";
import { createNotification } from "@app/components/notifications";
import { PermissionDeniedBanner } from "@app/components/permissions";
import { ContentLoader, Pagination } from "@app/components/v2";
import {
  ProjectPermissionActions,
  ProjectPermissionSub,
  useProjectPermission,
  useWorkspace
} from "@app/context";
import { useDebounce, usePopUp } from "@app/hooks";
import {
  useGetSecretApprovalPolicyOfABoard,
  useGetWorkspaceSnapshotList,
  useGetWsSnapshotCount,
  useGetWsTags
} from "@app/hooks/api";
import { useGetProjectSecretsDetails } from "@app/hooks/api/dashboard";
import { OrderByDirection } from "@app/hooks/api/generic/types";
import { DynamicSecretListView } from "@app/views/SecretMainPage/components/DynamicSecretListView";
import { FolderListView } from "@app/views/SecretMainPage/components/FolderListView";
import { SecretImportListView } from "@app/views/SecretMainPage/components/SecretImportListView";

import { SecretV2MigrationSection } from "../SecretOverviewPage/components/SecretV2MigrationSection";
import { ActionBar } from "./components/ActionBar";
import { CreateSecretForm } from "./components/CreateSecretForm";
import { PitDrawer } from "./components/PitDrawer";
import { SecretDropzone } from "./components/SecretDropzone";
import { SecretListView } from "./components/SecretListView";
import { SnapshotView } from "./components/SnapshotView";
import { StoreProvider } from "./SecretMainPage.store";
import { Filter, RowType } from "./SecretMainPage.types";

const LOADER_TEXT = [
  "Retrieving your encrypted secrets...",
  "Fetching folders...",
  "Getting secret import links..."
];

const INIT_PER_PAGE = 20;
export const SecretMainPage = () => {
  const { t } = useTranslation();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const router = useRouter();
  const { permission } = useProjectPermission();

  const [isVisible, setIsVisible] = useState(false);
  const [orderDirection, setOrderDirection] = useState<OrderByDirection>(OrderByDirection.ASC);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(INIT_PER_PAGE);
  const paginationOffset = (page - 1) * perPage;

  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const isRollbackMode = Boolean(snapshotId);
  const { popUp, handlePopUpClose, handlePopUpToggle } = usePopUp(["snapshots"] as const);

  // env slug
  const environment = router.query.env as string;
  const workspaceId = currentWorkspace?.id || "";
  const projectSlug = currentWorkspace?.slug || "";
  const secretPath = (router.query.secretPath as string) || "/";
  const canReadSecret = permission.can(
    ProjectPermissionActions.Read,
    subject(ProjectPermissionSub.Secrets, { environment, secretPath })
  );
  const canDoReadRollback = permission.can(
    ProjectPermissionActions.Read,
    ProjectPermissionSub.SecretRollback
  );

  const [filter, setFilter] = useState<Filter>({
    tags: {},
    searchFilter: (router.query.searchFilter as string) || "",
    include: {
      [RowType.Folder]: true,
      [RowType.Import]: canReadSecret,
      [RowType.DynamicSecret]: canReadSecret,
      [RowType.Secret]: canReadSecret
    }
  });
  const debouncedSearchFilter = useDebounce(filter.searchFilter);

  useEffect(() => {
    if (
      !isWorkspaceLoading &&
      !currentWorkspace?.environments.find((env) => env.slug === environment) &&
      router.isReady
    ) {
      router.push(`/project/${workspaceId}/secrets/overview`);
      createNotification({
        text: "No environment found with given slug",
        type: "error"
      });
    }
  }, [isWorkspaceLoading, currentWorkspace, environment, router.isReady]);

  // fetch secrets
  // const { data: secrets, isLoading: isSecretsLoading } = useGetProjectSecrets({
  //   environment,
  //   workspaceId,
  //   secretPath,
  //   options: {
  //     enabled: canReadSecret
  //   }
  // });

  const { data, isLoading: isDetailsLoading } = useGetProjectSecretsDetails({
    environment,
    projectId: workspaceId,
    secretPath,
    offset: paginationOffset,
    limit: perPage,
    search: debouncedSearchFilter,
    orderDirection,
    includeImports: canReadSecret && filter.include.import,
    includeFolders: filter.include.folder,
    includeDynamicSecrets: canReadSecret && filter.include.dynamic,
    includeSecrets: canReadSecret && filter.include.secret
  });

  // const { data: foldersData, isLoading: isFoldersLoading } = useGetProjectFolders({
  //   projectId: workspaceId,
  //   environment,
  //   path: secretPath,
  //   options: {
  //     enabled: !canReadSecret // gotten with details if user has read access
  //   }
  // });

  // TODO: hide pagination if only folders OR older version of project

  const {
    imports,
    folders,
    dynamicSecrets,
    secrets,
    totalImportCount = 0,
    totalFolderCount = 0,
    totalDynamicSecretCount = 0,
    totalSecretCount = 0,
    totalCount = 0
  } = data ?? {};

  // fetch folders

  // fetch secret imports
  // const {
  //   data: secretImports,
  //   isLoading: isSecretImportsLoading
  //   // isFetching: isSecretImportsFetching
  // } = useGetSecretImports({
  //   projectId: workspaceId,
  //   environment,
  //   path: secretPath,
  //   options: {
  //     enabled: canReadSecret
  //   }
  // });

  // fetch imported secrets to show user the overriden ones
  // const { data: importedSecrets } = useGetImportedSecretsSingleEnv({
  //   projectId: workspaceId,
  //   environment,
  //   path: secretPath,
  //   options: {
  //     enabled: canReadSecret
  //   }
  // });

  // const { data: dynamicSecrets } = useGetDynamicSecrets({
  //   projectSlug,
  //   environmentSlug: environment,
  //   path: secretPath
  // });

  // fech tags
  const { data: tags } = useGetWsTags(canReadSecret ? workspaceId : "");

  const { data: boardPolicy } = useGetSecretApprovalPolicyOfABoard({
    workspaceId,
    environment,
    secretPath
  });
  const isProtectedBranch = Boolean(boardPolicy);

  const {
    data: snapshotList,
    isFetchingNextPage: isFetchingNextSnapshotList,
    fetchNextPage: fetchNextSnapshotList,
    hasNextPage: hasNextSnapshotListPage
  } = useGetWorkspaceSnapshotList({
    workspaceId,
    directory: secretPath,
    environment,
    isPaused: !popUp.snapshots.isOpen || !canDoReadRollback,
    limit: 10
  });

  const { data: snapshotCount, isLoading: isSnapshotCountLoading } = useGetWsSnapshotCount({
    workspaceId,
    environment,
    directory: secretPath,
    isPaused: !canDoReadRollback
  });

  const isNotEmpty = Boolean(
    secrets?.length || folders?.length || imports?.length || dynamicSecrets?.length
  );

  const handleSortToggle = () =>
    setOrderDirection((state) =>
      state === OrderByDirection.ASC ? OrderByDirection.DESC : OrderByDirection.ASC
    );

  const handleEnvChange = (slug: string) => {
    const query: Record<string, string> = { ...router.query, env: slug };
    delete query.secretPath;
    router.push({
      pathname: router.pathname,
      query
    });
  };

  const handleTagToggle = useCallback(
    (tagId: string) =>
      setFilter((state) => {
        const isTagPresent = Boolean(state.tags?.[tagId]);
        const newTagFilter = { ...state.tags };
        if (isTagPresent) delete newTagFilter[tagId];
        else newTagFilter[tagId] = true;
        return { ...state, tags: newTagFilter };
      }),
    []
  );

  const handleToggleRowType = useCallback(
    (rowType: RowType) =>
      setFilter((state) => {
        return {
          ...state,
          include: {
            ...state.include,
            [rowType]: !state.include[rowType]
          }
        };
      }),
    []
  );

  const handleSearchChange = useCallback(
    (searchFilter: string) => setFilter((state) => ({ ...state, searchFilter })),
    []
  );

  const handleToggleVisibility = useCallback(() => setIsVisible((state) => !state), []);

  // snapshot functions
  const handleSelectSnapshot = useCallback((snapId: string) => {
    setSnapshotId(snapId);
  }, []);

  const handleResetSnapshot = useCallback(() => {
    setSnapshotId(null);
    handlePopUpClose("snapshots");
  }, []);

  // loading screen when u have permission
  // const isLoading =
  //   canReadSecret && (isDetailsLoading || isSecretImportsLoading || isDynamicSecretLoading);

  // const rows = useMemo(() => {
  //   const filteredSecrets =
  //     secrets
  //       ?.filter(({ key, tags: secretTags, value }) => {
  //         const isTagFilterActive = Boolean(Object.keys(filter.tags).length);
  //         return (
  //           (!isTagFilterActive || secretTags?.some(({ id }) => filter.tags?.[id])) &&
  //           (key.toUpperCase().includes(debouncedSearchFilter.toUpperCase()) ||
  //             value?.toLowerCase().includes(debouncedSearchFilter.toLowerCase()))
  //         );
  //       })
  //       .sort((a, b) =>
  //         orderDirection === OrderByDirection.ASC
  //           ? a.key.localeCompare(b.key)
  //           : b.key.localeCompare(a.key)
  //       ) ?? [];
  //   const filteredFolders =
  //     folders
  //       ?.filter(({ name }) => name.toLowerCase().includes(debouncedSearchFilter.toLowerCase()))
  //       .sort((a, b) =>
  //         orderDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  //       ) ?? [];
  //   const filteredDynamicSecrets =
  //     dynamicSecrets
  //       ?.filter(({ name }) => name.toLowerCase().includes(debouncedSearchFilter.toLowerCase()))
  //       .sort((a, b) =>
  //         orderDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  //       ) ?? [];
  //   const filteredSecretImports =
  //     secretImports
  //       ?.filter(({ importPath }) =>
  //         importPath.toLowerCase().includes(debouncedSearchFilter.toLowerCase())
  //       )
  //       .sort((a, b) =>
  //         orderDirection === "asc"
  //           ? a.importPath.localeCompare(b.importPath)
  //           : b.importPath.localeCompare(a.importPath)
  //       ) ?? [];
  //
  //   const totalRows =
  //     filteredSecretImports.length +
  //     filteredFolders.length +
  //     filteredDynamicSecrets.length +
  //     filteredSecrets.length;
  //
  //   const paginatedImports = filteredSecretImports.slice(
  //     paginationOffset,
  //     paginationOffset + perPage
  //   );
  //
  //   let remainingRows = perPage - paginatedImports.length;
  //   const foldersStartIndex = Math.max(0, paginationOffset - filteredSecretImports.length);
  //   const paginatedFolders =
  //     remainingRows > 0
  //       ? filteredFolders.slice(foldersStartIndex, foldersStartIndex + remainingRows)
  //       : [];
  //
  //   remainingRows -= paginatedFolders.length;
  //   const dynamicSecretStartIndex = Math.max(
  //     0,
  //     paginationOffset - filteredSecretImports.length - filteredFolders.length
  //   );
  //   const paginatiedDynamicSecrets =
  //     remainingRows > 0
  //       ? filteredDynamicSecrets.slice(
  //           dynamicSecretStartIndex,
  //           dynamicSecretStartIndex + remainingRows
  //         )
  //       : [];
  //
  //   remainingRows -= paginatiedDynamicSecrets.length;
  //   const secretStartIndex = Math.max(
  //     0,
  //     paginationOffset -
  //       filteredSecretImports.length -
  //       filteredFolders.length -
  //       filteredDynamicSecrets.length
  //   );
  //
  //   const paginatiedSecrets =
  //     remainingRows > 0
  //       ? filteredSecrets.slice(secretStartIndex, secretStartIndex + remainingRows)
  //       : [];
  //
  //   return {
  //     imports: paginatedImports,
  //     folders: paginatedFolders,
  //     secrets: paginatiedSecrets,
  //     dynamicSecrets: paginatiedDynamicSecrets,
  //     totalRows
  //   };
  // }, [
  //   orderDirection,
  //   debouncedSearchFilter,
  //   folders,
  //   secrets,
  //   dynamicSecrets,
  //   paginationOffset,
  //   perPage,
  //   filter.tags,
  //   importedSecrets
  // ]);

  useEffect(() => {
    // reset page if no longer valid
    if (totalCount < paginationOffset) setPage(1);
  }, [totalCount]);

  // // loading screen when you don't have permission but as folder's is viewable need to wait for that
  // const loadingOnDenied = !canReadSecret && isFoldersLoading;
  if (isDetailsLoading) {
    return <ContentLoader text={LOADER_TEXT} />;
  }

  const showPagination = true; // TODO: determine

  return (
    <StoreProvider>
      <div className="container mx-auto flex h-full flex-col px-6 text-mineshaft-50 dark:[color-scheme:dark]">
        <SecretV2MigrationSection />
        <div className="relative right-6 -top-2 mb-2 ml-6">
          <NavHeader
            pageName={t("dashboard.title")}
            currentEnv={environment}
            userAvailableEnvs={currentWorkspace?.environments.filter(({ slug }) =>
              permission.can(
                ProjectPermissionActions.Read,
                subject(ProjectPermissionSub.Secrets, {
                  environment: slug,
                  secretPath
                })
              )
            )}
            isFolderMode
            secretPath={secretPath}
            isProjectRelated
            onEnvChange={handleEnvChange}
            isProtectedBranch={isProtectedBranch}
            protectionPolicyName={boardPolicy?.name}
          />
        </div>
        {!isRollbackMode ? (
          <>
            <ActionBar
              secrets={secrets}
              environment={environment}
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              secretPath={secretPath}
              isVisible={isVisible}
              filter={filter}
              tags={tags}
              onVisibilityToggle={handleToggleVisibility}
              onSearchChange={handleSearchChange}
              onToggleTagFilter={handleTagToggle}
              snapshotCount={snapshotCount || 0}
              isSnapshotCountLoading={isSnapshotCountLoading}
              onToggleRowType={handleToggleRowType}
              onClickRollbackMode={() => handlePopUpToggle("snapshots", true)}
            />
            <div className="thin-scrollbar mt-3 overflow-y-auto overflow-x-hidden rounded-md rounded-b-none bg-mineshaft-800 text-left text-sm text-bunker-300">
              <div className="flex flex-col" id="dashboard">
                {isNotEmpty && (
                  <div
                    className={twMerge(
                      "flex border-b border-mineshaft-600 font-medium",
                      showPagination ? "sticky top-0 bg-mineshaft-800" : ""
                    )}
                  >
                    <div style={{ width: "2.8rem" }} className="flex-shrink-0 px-4 py-3" />
                    <div
                      className="flex w-80 flex-shrink-0 items-center border-r border-mineshaft-600 px-4 py-2"
                      role="button"
                      tabIndex={0}
                      onClick={handleSortToggle}
                      onKeyDown={(evt) => {
                        if (evt.key === "Enter") handleSortToggle();
                      }}
                    >
                      Key
                      <FontAwesomeIcon
                        icon={orderDirection === OrderByDirection.ASC ? faArrowDown : faArrowUp}
                        className="ml-2"
                      />
                    </div>
                    <div className="flex-grow px-4 py-2">Value</div>
                  </div>
                )}
                {canReadSecret && (
                  <SecretImportListView
                    secretImports={imports}
                    isFetching={isDetailsLoading}
                    environment={environment}
                    workspaceId={workspaceId}
                    secretPath={secretPath}
                  />
                )}
                <FolderListView
                  folders={folders}
                  environment={environment}
                  workspaceId={workspaceId}
                  secretPath={secretPath}
                />
                {canReadSecret && (
                  <DynamicSecretListView
                    environment={environment}
                    projectSlug={projectSlug}
                    secretPath={secretPath}
                    dynamicSecrets={dynamicSecrets}
                  />
                )}
                {canReadSecret && (
                  <SecretListView
                    secrets={secrets}
                    tags={tags}
                    isVisible={isVisible}
                    environment={environment}
                    workspaceId={workspaceId}
                    secretPath={secretPath}
                    isProtectedBranch={isProtectedBranch}
                  />
                )}
                {!canReadSecret && folders?.length === 0 && <PermissionDeniedBanner />}
              </div>
            </div>
            {showPagination && !isDetailsLoading && totalCount > INIT_PER_PAGE && (
              <Pagination
                startAdornment={
                  <div className="flex items-center gap-2 divide-x divide-mineshaft-500 text-sm text-mineshaft-400">
                    {totalImportCount > 0 && (
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faFileImport} className=" text-green-700" />
                        <span>{totalImportCount}</span>
                      </div>
                    )}
                    {totalFolderCount > 0 && (
                      <div className="flex items-center gap-2 pl-2">
                        <FontAwesomeIcon icon={faFolder} className="text-yellow-700" />
                        <span>{totalFolderCount}</span>
                      </div>
                    )}
                    {totalDynamicSecretCount > 0 && (
                      <div className="flex items-center gap-2 pl-2">
                        <FontAwesomeIcon icon={faFingerprint} className="text-yellow-700" />
                        <span>{totalDynamicSecretCount}</span>
                      </div>
                    )}
                    {totalSecretCount > 0 && (
                      <div className="flex items-center gap-2 pl-2">
                        <FontAwesomeIcon icon={faKey} className="text-bunker-300" />
                        <span>{totalSecretCount}</span>
                      </div>
                    )}
                  </div>
                }
                className="rounded-b-md border-t border-solid border-t-mineshaft-600"
                count={totalCount}
                page={page}
                perPage={perPage}
                onChangePage={(newPage) => setPage(newPage)}
                onChangePerPage={(newPerPage) => setPerPage(newPerPage)}
              />
            )}
            <CreateSecretForm
              environment={environment}
              workspaceId={workspaceId}
              secretPath={secretPath}
              autoCapitalize={currentWorkspace?.autoCapitalization}
              isProtectedBranch={isProtectedBranch}
            />
            <SecretDropzone
              secrets={secrets}
              environment={environment}
              workspaceId={workspaceId}
              secretPath={secretPath}
              isSmaller={isNotEmpty}
              environments={currentWorkspace?.environments}
              isProtectedBranch={isProtectedBranch}
            />
            <PitDrawer
              secretSnaphots={snapshotList}
              snapshotId={snapshotId}
              isDrawerOpen={popUp.snapshots.isOpen}
              onOpenChange={(isOpen) => handlePopUpToggle("snapshots", isOpen)}
              hasNextPage={hasNextSnapshotListPage}
              fetchNextPage={fetchNextSnapshotList}
              onSelectSnapshot={handleSelectSnapshot}
              isFetchingNextPage={isFetchingNextSnapshotList}
            />
          </>
        ) : (
          <SnapshotView
            snapshotId={snapshotId || ""}
            environment={environment}
            workspaceId={workspaceId}
            secretPath={secretPath}
            secrets={secrets}
            folders={folders}
            snapshotCount={snapshotCount}
            onGoBack={handleResetSnapshot}
            onClickListSnapshot={() => handlePopUpToggle("snapshots", true)}
          />
        )}
      </div>
    </StoreProvider>
  );
};
