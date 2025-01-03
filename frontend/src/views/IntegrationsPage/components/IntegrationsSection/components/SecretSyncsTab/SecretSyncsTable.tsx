import { useMemo, useState } from "react";
import {
  faArrowDown,
  faArrowRightArrowLeft,
  faArrowUp,
  faCheckCircle,
  faFilter,
  faMagnifyingGlass,
  faSearch
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  EmptyState,
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
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import { usePagination, usePopUp, useResetPageHelper } from "@app/hooks";
import { TAppConnection } from "@app/hooks/api/appConnections";
import { OrderByDirection } from "@app/hooks/api/generic/types";
import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

// import { DeleteAppConnectionModal } from "./DeleteAppConnectionModal";
// import { EditAppConnectionCredentialsModal } from "./EditAppConnectionCredentialsModal";
// import { EditAppConnectionDetailsModal } from "./EditAppConnectionDetailsModal";

enum SecretSyncsOrderBy {
  Destination = "destination",
  Name = "name",
  Connection = "connection",
  Status = "status"
}

type SecretSyncFilters = {
  destinations: SecretSync[];
};

type Props = {
  secretSyncs: TSecretSync[];
};

export const SecretSyncsTable = ({ secretSyncs }: Props) => {
  const { popUp, handlePopUpOpen, handlePopUpToggle } = usePopUp(["deleteSync"] as const);

  const [filters, setFilters] = useState<SecretSyncFilters>({
    destinations: []
  });

  const {
    search,
    setSearch,
    setPage,
    page,
    perPage,
    setPerPage,
    offset,
    orderDirection,
    toggleOrderDirection,
    orderBy,
    setOrderDirection,
    setOrderBy
  } = usePagination<SecretSyncsOrderBy>(SecretSyncsOrderBy.Destination, { initPerPage: 20 });

  const filteredSecretSyncs = useMemo(
    () =>
      secretSyncs
        .filter((secretSync) => {
          const { destination, name, connection } = secretSync;

          if (filters.destinations.length && !filters.destinations.includes(destination))
            return false;

          const searchValue = search.trim().toLowerCase();

          // TODO: destination

          return (
            SECRET_SYNC_MAP[destination].name.toLowerCase().includes(searchValue) ||
            name.toLowerCase().includes(searchValue) ||
            connection.name.toLowerCase().includes(searchValue)
          );
        })
        .sort((a, b) => {
          const [syncOne, syncTwo] = orderDirection === OrderByDirection.ASC ? [a, b] : [b, a];

          switch (orderBy) {
            case SecretSyncsOrderBy.Name:
              return syncOne.name.toLowerCase().localeCompare(syncTwo.name.toLowerCase());
            case SecretSyncsOrderBy.Connection:
              return syncOne.connection.name
                .toLowerCase()
                .localeCompare(syncTwo.connection.name.toLowerCase());
            case SecretSyncsOrderBy.Destination:
            default:
              return SECRET_SYNC_MAP[syncOne.destination].name
                .toLowerCase()
                .localeCompare(SECRET_SYNC_MAP[syncTwo.destination].name.toLowerCase());
          }
        }),
    [secretSyncs, orderDirection, search, orderBy, filters]
  );

  useResetPageHelper({
    totalCount: filteredSecretSyncs.length,
    offset,
    setPage
  });

  const handleSort = (column: SecretSyncsOrderBy) => {
    if (column === orderBy) {
      toggleOrderDirection();
      return;
    }

    setOrderBy(column);
    setOrderDirection(OrderByDirection.ASC);
  };

  const getClassName = (col: SecretSyncsOrderBy) =>
    twMerge("ml-2", orderBy === col ? "" : "opacity-30");

  const getColSortIcon = (col: SecretSyncsOrderBy) =>
    orderDirection === OrderByDirection.DESC && orderBy === col ? faArrowUp : faArrowDown;

  const isTableFiltered = Boolean(filters.destinations.length);

  const handleDelete = (appConnection: TAppConnection) =>
    handlePopUpOpen("deleteSync", appConnection);

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
          placeholder="Search secret syncs..."
          className="flex-1"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              ariaLabel="Filter secret syncs"
              variant="plain"
              size="sm"
              className={twMerge(
                "flex h-10 w-11 items-center justify-center overflow-hidden border border-mineshaft-600 bg-mineshaft-800 p-0 transition-all hover:border-primary/60 hover:bg-primary/10",
                isTableFiltered && "border-primary/50 text-primary"
              )}
            >
              <FontAwesomeIcon icon={faFilter} />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="thin-scrollbar max-h-[70vh] overflow-y-auto" align="end">
            <DropdownMenuLabel>Filter by Secret Syncs</DropdownMenuLabel>
            {secretSyncs.length ? (
              [...new Set(secretSyncs.map(({ destination }) => destination))].map((destination) => {
                const { name, image } = SECRET_SYNC_MAP[destination];

                return (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setFilters((prev) => ({
                        ...prev,
                        destinations: prev.destinations.includes(destination)
                          ? prev.destinations.filter((a) => a !== destination)
                          : [...prev.destinations, destination]
                      }));
                    }}
                    key={destination}
                    icon={
                      filters.destinations.includes(destination) && (
                        <FontAwesomeIcon className="text-primary" icon={faCheckCircle} />
                      )
                    }
                    iconPos="right"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        alt={`${name} integration`}
                        src={`/images/integrations/${image}`}
                        className="h-4 w-4"
                      />
                      <span>{name}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <DropdownMenuItem isDisabled>No Secret Syncs Configured</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TableContainer className="mt-4">
        <Table>
          <THead>
            <Tr>
              <Th className="w-1/4">
                <div className="flex items-center">
                  Sync
                  <IconButton
                    variant="plain"
                    className={getClassName(SecretSyncsOrderBy.Destination)}
                    ariaLabel="sort"
                    onClick={() => handleSort(SecretSyncsOrderBy.Destination)}
                  >
                    <FontAwesomeIcon icon={getColSortIcon(SecretSyncsOrderBy.Destination)} />
                  </IconButton>
                </div>
              </Th>
              <Th className="w-1/3">
                <div className="flex items-center">
                  Name
                  <IconButton
                    variant="plain"
                    className={getClassName(SecretSyncsOrderBy.Name)}
                    ariaLabel="sort"
                    onClick={() => handleSort(SecretSyncsOrderBy.Name)}
                  >
                    <FontAwesomeIcon icon={getColSortIcon(SecretSyncsOrderBy.Name)} />
                  </IconButton>
                </div>
              </Th>
              <Th>
                <div className="flex items-center">
                  Connection
                  <IconButton
                    variant="plain"
                    className={getClassName(SecretSyncsOrderBy.Connection)}
                    ariaLabel="sort"
                    onClick={() => handleSort(SecretSyncsOrderBy.Connection)}
                  >
                    <FontAwesomeIcon icon={getColSortIcon(SecretSyncsOrderBy.Connection)} />
                  </IconButton>
                </div>
              </Th>

              <Th className="w-5" />
            </Tr>
          </THead>
          <TBody>
            {/* {filteredAppConnections.slice(offset, perPage * page).map((connection) => ( */}
            {/*  <AppConnectionRow */}
            {/*    appConnection={connection} */}
            {/*    key={connection.id} */}
            {/*    onDelete={handleDelete} */}
            {/*    onEditCredentials={handleEditCredentials} */}
            {/*    onEditDetails={handleEditDetails} */}
            {/*  /> */}
            {/* ))} */}
          </TBody>
        </Table>
        {Boolean(filteredSecretSyncs.length) && (
          <Pagination
            count={filteredSecretSyncs.length}
            page={page}
            perPage={perPage}
            onChangePage={setPage}
            onChangePerPage={setPerPage}
          />
        )}
        {!filteredSecretSyncs?.length && (
          <EmptyState
            title={
              secretSyncs.length
                ? "No syncs match search..."
                : "This project has no syncs configured"
            }
            icon={secretSyncs.length ? faSearch : faArrowRightArrowLeft}
          />
        )}
      </TableContainer>
      {/* <DeleteAppConnectionModal
        isOpen={popUp.deleteSync.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("deleteSync", isOpen)}
        appConnection={popUp.deleteSync.data}
      />
      <EditAppConnectionCredentialsModal
        isOpen={popUp.editCredentials.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("editCredentials", isOpen)}
        appConnection={popUp.editCredentials.data}
      />
      <EditAppConnectionDetailsModal
        isOpen={popUp.editDetails.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("editDetails", isOpen)}
        appConnection={popUp.editDetails.data}
      /> */}
    </div>
  );
};
