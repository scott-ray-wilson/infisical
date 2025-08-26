import { useCallback, useRef, useState } from "react";
import { MultiValue } from "react-select";
import {
  faArrowDown,
  faArrowUp,
  faCheckCircle,
  faFilter,
  faFingerprint,
  faFolder,
  faKey,
  faRotate,
  faSearch
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  FilterableSelect,
  FormLabel,
  IconButton,
  Input,
  Pagination,
  Table,
  TableContainer,
  TBody,
  Th,
  THead,
  Tr
} from "@app/components/v2";
import { HeaderResizer } from "@app/components/v2/HeaderResizer/HeaderResizer";
import {
  ProjectPermissionActions,
  ProjectPermissionSub,
  useProjectPermission,
  useWorkspace
} from "@app/context";
import {
  getUserTablePreference,
  PreferenceKey,
  setUserTablePreference
} from "@app/helpers/userTablePreferences";
import { useDebounce, usePagination, useResetPageHelper } from "@app/hooks";
import { useGetImportedSecretsAllEnvs, useGetWsTags } from "@app/hooks/api";
import { useGetProjectSecretsOverview } from "@app/hooks/api/dashboard";
import { DashboardSecretsOrderBy } from "@app/hooks/api/dashboard/types";
import { OrderByDirection } from "@app/hooks/api/generic/types";
import { WorkspaceEnv } from "@app/hooks/api/workspace/types";
import { useResizableColWidth } from "@app/hooks/useResizableColWidth";
import {
  useDynamicSecretOverview,
  useFolderOverview,
  useSecretOverview,
  useSecretRotationOverview
} from "@app/hooks/utils";
import { SecretOverviewDynamicSecretRow } from "@app/pages/secret-manager/OverviewPage/components/SecretOverviewDynamicSecretRow";
import { SecretOverviewFolderRow } from "@app/pages/secret-manager/OverviewPage/components/SecretOverviewFolderRow";
import { SecretOverviewSecretRotationRow } from "@app/pages/secret-manager/OverviewPage/components/SecretOverviewSecretRotationRow";
import {
  SecretNoAccessOverviewTableRow,
  SecretOverviewTableRow
} from "@app/pages/secret-manager/OverviewPage/components/SecretOverviewTableRow";
import { SecretSearchInput } from "@app/pages/secret-manager/OverviewPage/components/SecretSearchInput";
import { SecretTableResourceCount } from "@app/pages/secret-manager/OverviewPage/components/SecretTableResourceCount";
import { SecretRow } from "@app/pages/secret-manager/SecretDashboardPage/components/CompareEnvironments/components/SecretRow";

type Props = {
  currentEnvSlug: string;
  secretPath: string;
};

enum RowType {
  Folder = "folder",
  DynamicSecret = "dynamic",
  Secret = "secret",
  SecretRotation = "rotation"
}

type Filter = {
  [key in RowType]: boolean;
};

const DEFAULT_FILTER_STATE = {
  [RowType.Folder]: false,
  [RowType.DynamicSecret]: false,
  [RowType.Secret]: false,
  [RowType.SecretRotation]: false
};

export const CompareEnvironments = ({ currentEnvSlug, secretPath }: Props) => {
  const { currentWorkspace } = useWorkspace();

  const [selectedEnvironments, setSelectedEnvironments] = useState<WorkspaceEnv[]>(() =>
    currentEnvSlug
      ? [currentWorkspace.environments.find((env) => env.slug === currentEnvSlug)!]
      : []
  );

  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER_STATE);

  const {
    offset,
    limit,
    orderDirection,
    setOrderDirection,
    setPage,
    perPage,
    page,
    setPerPage,
    orderBy
  } = usePagination<DashboardSecretsOrderBy>(DashboardSecretsOrderBy.Name, {
    initPerPage: getUserTablePreference("secretCompareTable", PreferenceKey.PerPage, 50)
  });

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setUserTablePreference("secretCompareTable", PreferenceKey.PerPage, newPerPage);
  };

  const { permission } = useProjectPermission();

  const workspaceId = currentWorkspace.id;
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedSearchFilter, setDebouncedSearchFilter] = useDebounce(searchFilter);

  const {
    secretImports,
    isImportedSecretPresentInEnv,
    getImportedSecretByKey,
    getEnvImportedSecretKeyCount
  } = useGetImportedSecretsAllEnvs({
    projectId: workspaceId,
    path: secretPath,
    environments: (currentWorkspace.environments || []).map(({ slug }) => slug)
  });

  const compareEnvironments = selectedEnvironments.length
    ? selectedEnvironments
    : currentWorkspace.environments;

  const isFilteredByResources = Object.values(filter).some(Boolean);
  const { isPending: isOverviewLoading, data: overview } = useGetProjectSecretsOverview(
    {
      projectId: workspaceId,
      environments: compareEnvironments.map((env) => env.slug),
      secretPath,
      orderDirection,
      orderBy,
      includeFolders: isFilteredByResources ? filter.folder : true,
      includeDynamicSecrets: isFilteredByResources ? filter.dynamic : true,
      includeSecrets: isFilteredByResources ? filter.secret : true,
      includeImports: true,
      includeSecretRotations: isFilteredByResources ? filter.rotation : true,
      search: debouncedSearchFilter,
      limit,
      offset
    },
    { enabled: Boolean(compareEnvironments.length) }
  );

  const {
    secrets,
    folders,
    dynamicSecrets,
    secretRotations,
    totalFolderCount,
    totalSecretCount,
    totalDynamicSecretCount,
    totalSecretRotationCount,
    totalImportCount,
    totalCount = 0,
    totalUniqueFoldersInPage,
    totalUniqueSecretsInPage,
    totalUniqueSecretImportsInPage,
    totalUniqueDynamicSecretsInPage,
    totalUniqueSecretRotationsInPage,
    importedByEnvs,
    usedBySecretSyncs
  } = overview ?? {};

  const secretImportsShaped = secretImports
    ?.flatMap(({ data }) => data)
    .filter(Boolean)
    .flatMap((item) => item?.secrets || []);

  const handleIsImportedSecretPresentInEnv = (envSlug: string, secretName: string) => {
    if (secrets?.some((s) => s.key === secretName && s.env === envSlug)) {
      return false;
    }
    if (secretImportsShaped.some((s) => s.key === secretName && s.sourceEnv === envSlug)) {
      return true;
    }
    return isImportedSecretPresentInEnv(envSlug, secretName);
  };

  useResetPageHelper({
    totalCount,
    offset,
    setPage
  });

  const { folderNamesAndDescriptions, getFolderByNameAndEnv, isFolderPresentInEnv } =
    useFolderOverview(folders);

  const { dynamicSecretNames, isDynamicSecretPresentInEnv } =
    useDynamicSecretOverview(dynamicSecrets);

  const {
    secretRotationNames,
    isSecretRotationPresentInEnv,
    getSecretRotationByName,
    getSecretRotationStatusesByName
  } = useSecretRotationOverview(secretRotations);

  const { secKeys, getEnvSecretKeyCount } = useSecretOverview(
    secrets?.concat(secretImportsShaped) || []
  );

  const getSecretByKey = useCallback(
    (env: string, key: string) => {
      const sec = secrets?.find((s) => s.env === env && s.key === key);
      return sec;
    },
    [secrets]
  );

  const { data: tags } = useGetWsTags(
    permission.can(ProjectPermissionActions.Read, ProjectPermissionSub.Tags) ? workspaceId : ""
  );

  const tableRef = useRef<HTMLDivElement>(null);

  const { handleMouseDown, isResizing, colWidth } = useResizableColWidth({
    initialWidth: 320,
    minWidth: 100,
    maxWidth: tableRef.current
      ? tableRef.current.clientWidth - 148 // ensure value column can't collapse completely
      : 800
  });

  const handleToggleRowType = useCallback(
    (rowType: RowType) =>
      setFilter((state) => {
        return {
          ...state,
          [rowType]: !state[rowType]
        };
      }),
    []
  );

  const isTableEmpty = totalCount === 0;

  const isTableFiltered = isFilteredByResources;

  return (
    <div className="flex flex-col-reverse">
      {!isOverviewLoading && totalCount > 0 && (
        <Pagination
          startAdornment={
            <SecretTableResourceCount
              dynamicSecretCount={totalDynamicSecretCount}
              secretCount={totalSecretCount}
              folderCount={totalFolderCount}
              importCount={totalImportCount}
              secretRotationCount={totalSecretRotationCount}
            />
          }
          className="rounded-b-md border border-solid border-mineshaft-500 bg-mineshaft-700"
          count={totalCount}
          page={page}
          perPage={perPage}
          onChangePage={(newPage) => setPage(newPage)}
          onChangePerPage={handlePerPageChange}
        />
      )}
      <div ref={tableRef}>
        <TableContainer
          className="mt-4 rounded-b-none border-mineshaft-500"
          // onScroll={(e) => setScrollOffset(e.currentTarget.scrollLeft)}
        >
          <Table className="bg-mineshaft-700">
            <THead>
              <Tr className="">
                <Th className="sticky left-0 z-10 p-0" style={{ width: colWidth }}>
                  <div className="relative">
                    <div
                      tabIndex={-1}
                      role="button"
                      className={`absolute -right-[0.02rem] z-40 h-full w-0.5 cursor-ew-resize hover:bg-blue-400/20 ${
                        isResizing ? "bg-blue-400/75" : "bg-transparent"
                      }`}
                      onMouseDown={handleMouseDown}
                    />
                    <div className="pointer-events-none absolute -right-[0.02rem] top-[0.67rem] z-30">
                      <div className="h-5 w-0.5 rounded-[1.5px] bg-gray-400 opacity-50" />
                    </div>
                    <div className="flex h-full items-center border-r border-mineshaft-500 bg-mineshaft-700 bg-clip-padding p-0 px-4 py-2.5">
                      Name
                      <IconButton
                        variant="plain"
                        className="ml-2"
                        ariaLabel="sort"
                        onClick={() =>
                          setOrderDirection((prev) =>
                            prev === OrderByDirection.ASC
                              ? OrderByDirection.DESC
                              : OrderByDirection.ASC
                          )
                        }
                      >
                        <FontAwesomeIcon
                          icon={orderDirection === "asc" ? faArrowDown : faArrowUp}
                        />
                      </IconButton>
                    </div>
                  </div>
                </Th>
                {compareEnvironments?.map(({ name, slug }, index) => {
                  const envSecKeyCount = getEnvSecretKeyCount(slug);
                  const importedSecKeyCount = getEnvImportedSecretKeyCount(slug);
                  const missingKeyCount = secKeys.length - envSecKeyCount - importedSecKeyCount;

                  return (
                    <Th className="whitespace-nowrap p-0 text-center" key={`environment-${slug}`}>
                      <div
                        className={twMerge(
                          "h-full w-full border-mineshaft-500 bg-mineshaft-700 p-0 px-4 py-3 text-center",
                          index < compareEnvironments.length - 1 && "border-r"
                        )}
                      >
                        {name}
                      </div>
                    </Th>
                  );
                })}
              </Tr>
            </THead>
            <TBody>
              {secKeys.map((key, index) => (
                <SecretRow
                  colWidth={colWidth}
                  secretPath={secretPath}
                  getImportedSecretByKey={getImportedSecretByKey}
                  isImportedSecretPresentInEnv={handleIsImportedSecretPresentInEnv}
                  key={`overview-${key}-${index + 1}`}
                  environments={compareEnvironments}
                  secretKey={key}
                  getSecretByKey={getSecretByKey}
                />
              ))}
              <SecretNoAccessOverviewTableRow
                environments={selectedEnvironments}
                count={Math.max(
                  (page * perPage > totalCount ? totalCount % perPage : perPage) -
                    (totalUniqueFoldersInPage || 0) -
                    (totalUniqueDynamicSecretsInPage || 0) -
                    (totalUniqueSecretsInPage || 0) -
                    (totalUniqueSecretImportsInPage || 0) -
                    (totalUniqueSecretRotationsInPage || 0),
                  0
                )}
              />
            </TBody>
          </Table>
        </TableContainer>
      </div>
      <div className="mt-3 flex flex-row items-center justify-center space-x-2">
        <Input
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="h-full flex-1"
          placeholder="Search by resource name..."
          leftIcon={<FontAwesomeIcon icon={faSearch} />}
          containerClassName="h-10"
        />
        {compareEnvironments.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline_bg"
                className={twMerge(
                  "flex h-[2.5rem]",
                  isTableFiltered && "border-primary/40 bg-primary/10"
                )}
                leftIcon={
                  <FontAwesomeIcon
                    icon={faFilter}
                    className={isTableFiltered ? "text-primary/80" : undefined}
                  />
                }
              >
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="thin-scrollbar max-h-[70vh] overflow-y-auto"
              align="end"
              sideOffset={2}
            >
              <DropdownMenuLabel>Filter by Resource</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleToggleRowType(RowType.Folder);
                }}
                icon={filter[RowType.Folder] && <FontAwesomeIcon icon={faCheckCircle} />}
                iconPos="right"
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faFolder} className="text-yellow-700" />
                  <span>Folders</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleToggleRowType(RowType.DynamicSecret);
                }}
                icon={filter[RowType.DynamicSecret] && <FontAwesomeIcon icon={faCheckCircle} />}
                iconPos="right"
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faFingerprint} className="text-yellow-700" />
                  <span>Dynamic Secrets</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleToggleRowType(RowType.SecretRotation);
                }}
                icon={filter[RowType.SecretRotation] && <FontAwesomeIcon icon={faCheckCircle} />}
                iconPos="right"
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faRotate} className="text-mineshaft-400" />
                  <span>Secret Rotations</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleToggleRowType(RowType.Secret);
                }}
                icon={filter[RowType.Secret] && <FontAwesomeIcon icon={faCheckCircle} />}
                iconPos="right"
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faKey} className="text-bunker-300" />
                  <span>Secrets</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isTableFiltered && (
          <Button
            variant="plain"
            colorSchema="secondary"
            onClick={() => {
              setFilter(DEFAULT_FILTER_STATE);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>
      <div className="!z-[99999999]">
        <FormLabel label="Select Environments to Compare" />
        <FilterableSelect
          value={selectedEnvironments}
          onChange={(value) => {
            const selected = value as MultiValue<WorkspaceEnv>;

            setSelectedEnvironments((selected as WorkspaceEnv[]) ?? []);
          }}
          options={currentWorkspace.environments}
          getOptionValue={(option) => option.slug}
          getOptionLabel={(option) => option.name}
          isMulti
        />
      </div>
    </div>
  );
};
