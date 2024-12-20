import { ForbiddenError } from "@casl/ability";

import { ProjectType } from "@app/db/schemas";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/ee/services/permission/project-permission";
import { BadRequestError, InternalServerError, NotFoundError } from "@app/lib/errors";
import { OrgServiceActor } from "@app/lib/types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { APP_CONNECTION_NAME_MAP } from "@app/services/app-connection/app-connection-maps";
import { TAppConnectionServiceFactory } from "@app/services/app-connection/app-connection-service";
import { TAppConnection } from "@app/services/app-connection/app-connection-types";
import { TProjectEnvDALFactory } from "@app/services/project-env/project-env-dal";
import { listSecretSyncOptions } from "@app/services/secret-sync/secret-sync-fns";
import {
  TCreateSecretSyncDTO,
  TDeleteSecretSyncDTO,
  TFindSecretSyncByIdDTO,
  TFindSecretSyncByNameDTO,
  TListSecretSyncsByProjectId,
  TSecretSync,
  TUpdateSecretSyncDTO
} from "@app/services/secret-sync/secret-sync-types";

import { TSecretSyncDALFactory } from "./secret-sync-dal";
import { SecretSync } from "./secret-sync-enums";
import { SECRET_SYNC_NAME_MAP } from "./secret-sync-maps";

type TSecretSyncServiceFactoryDep = {
  secretSyncDAL: TSecretSyncDALFactory;
  appConnectionService: Pick<TAppConnectionServiceFactory, "utilizeAppConnectionById">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission">;
  projectEnvDAL: Pick<TProjectEnvDALFactory, "find" | "findOne">;
  licenseService: Pick<TLicenseServiceFactory, "getPlan">; // TODO: remove once launched
};

export type TSecretSyncServiceFactory = ReturnType<typeof secretSyncServiceFactory>;

const SECRET_SYNC_CONNECTION_MAP: Record<SecretSync, AppConnection> = {
  [SecretSync.AWSParameterStore]: AppConnection.AWS,
  [SecretSync.GitHub]: AppConnection.GitHub
};

const BadRequestOnInvalidConnectionForSync = (syncTo: SecretSync, appConnection: TAppConnection) => {
  const app = SECRET_SYNC_CONNECTION_MAP[syncTo];

  if (!app)
    throw new InternalServerError({
      message: `Unhandled Secret Sync destination: ${syncTo}`
    });

  if (appConnection.app !== app)
    throw new BadRequestError({
      message: `Invalid App Connection: cannot sync to ${SECRET_SYNC_NAME_MAP[syncTo]} using ${
        APP_CONNECTION_NAME_MAP[appConnection.app]
      } Connections`
    });
};

export const secretSyncServiceFactory = ({
  secretSyncDAL,
  projectEnvDAL,
  licenseService,
  permissionService,
  appConnectionService
}: TSecretSyncServiceFactoryDep) => {
  // app connections are disabled for public until launch
  const checkSecretSyncAvailability = async (orgId: string) => {
    const subscription = await licenseService.getPlan(orgId);

    if (!subscription.appConnections) throw new BadRequestError({ message: "Secret Syncs are not available yet." });
  };

  const listSecretSyncsByProjectId = async ({ projectId }: TListSecretSyncsByProjectId, actor: OrgServiceActor) => {
    await checkSecretSyncAvailability(actor.orgId);

    const { permission, ForbidOnInvalidProjectType } = await permissionService.getProjectPermission(
      actor.type,
      actor.id,
      projectId,
      actor.authMethod,
      actor.orgId
    );

    ForbidOnInvalidProjectType(ProjectType.SecretManager);

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Read, ProjectPermissionSub.SecretSync);

    const environments = await projectEnvDAL.find({ projectId });

    const secretSyncs = await secretSyncDAL.find({
      $in: {
        envId: environments.map((env) => env.id)
      }
    });

    return secretSyncs as TSecretSync[];
  };

  const findSecretSyncById = async ({ syncDestination, syncId }: TFindSecretSyncByIdDTO, actor: OrgServiceActor) => {
    await checkSecretSyncAvailability(actor.orgId);

    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync)
      throw new NotFoundError({
        message: `Could not find ${SECRET_SYNC_NAME_MAP[syncDestination]} Sync with ID ${syncId}`
      });

    const { permission, ForbidOnInvalidProjectType } = await permissionService.getProjectPermission(
      actor.type,
      actor.id,
      secretSync.projectId,
      actor.authMethod,
      actor.orgId
    );

    ForbidOnInvalidProjectType(ProjectType.SecretManager);

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Read, ProjectPermissionSub.SecretSync);

    if (secretSync.connection.app !== SECRET_SYNC_CONNECTION_MAP[syncDestination])
      // TODO: further differentiate for sub-services
      throw new BadRequestError({
        message: `Secret sync with ID ${syncId} is not configured for ${SECRET_SYNC_NAME_MAP[syncDestination]}`
      });

    return secretSync as TSecretSync;
  };

  const findSecretSyncByName = async (
    { syncDestination, syncName, projectId }: TFindSecretSyncByNameDTO,
    actor: OrgServiceActor
  ) => {
    await checkSecretSyncAvailability(actor.orgId);

    const environments = await projectEnvDAL.find({ projectId });

    // we prevent name conflicts within a project so this will only return one at most
    const [secretSync] = await secretSyncDAL.find({
      name: syncName,
      $in: {
        id: environments.map((env) => env.id)
      }
    });

    if (!secretSync)
      throw new NotFoundError({
        message: `Could not find ${SECRET_SYNC_NAME_MAP[syncDestination]} Sync with name ${syncName}`
      });

    const { permission, ForbidOnInvalidProjectType } = await permissionService.getProjectPermission(
      actor.type,
      actor.id,
      secretSync.projectId,
      actor.authMethod,
      actor.orgId
    );

    ForbidOnInvalidProjectType(ProjectType.SecretManager);

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Read, ProjectPermissionSub.SecretSync);

    if (secretSync.connection.app !== SECRET_SYNC_CONNECTION_MAP[syncDestination])
      // TODO: further differentiate for sub-services
      throw new BadRequestError({
        message: `Secret sync with name ${syncName} is not configured for ${SECRET_SYNC_NAME_MAP[syncDestination]}`
      });

    return secretSync as TSecretSync;
  };

  const createSecretSync = async ({ syncDestination, ...params }: TCreateSecretSyncDTO, actor: OrgServiceActor) => {
    await checkSecretSyncAvailability(actor.orgId);

    const environment = await projectEnvDAL.findOne({
      id: params.envId
    });

    if (!environment) throw new BadRequestError({ message: `Could not find Environment with ID ${params.envId}` });

    const { permission, ForbidOnInvalidProjectType } = await permissionService.getProjectPermission(
      actor.type,
      actor.id,
      environment.projectId,
      actor.authMethod,
      actor.orgId
    );

    ForbidOnInvalidProjectType(ProjectType.SecretManager);

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Create, ProjectPermissionSub.SecretSync);

    const appConnection = await appConnectionService.utilizeAppConnectionById(params.connectionId);

    BadRequestOnInvalidConnectionForSync(syncDestination, appConnection);

    const projectEnvironments = await projectEnvDAL.find({
      projectId: environment.projectId
    });

    const secretSync = await secretSyncDAL.transaction(async (tx) => {
      const isConflictingName = Boolean(
        (
          await secretSyncDAL.find(
            {
              name: params.name,
              $in: {
                envId: projectEnvironments.map((env) => env.id)
              }
            },
            tx
          )
        ).length
      );

      if (isConflictingName)
        throw new BadRequestError({
          message: `A Secret Sync with the name "${params.name}" already exists the project with ID ${environment.projectId}`
        });

      const sync = await secretSyncDAL.create(params);

      return sync;
    });

    return secretSync as TSecretSync;
  };

  const updateSecretSync = async (
    { syncDestination, syncId, ...params }: TUpdateSecretSyncDTO,
    actor: OrgServiceActor
  ) => {
    await checkSecretSyncAvailability(actor.orgId);

    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync)
      throw new NotFoundError({
        message: `Could not find ${SECRET_SYNC_NAME_MAP[syncDestination]} Sync with ID ${syncId}`
      });

    if (secretSync.connection.app !== SECRET_SYNC_CONNECTION_MAP[syncDestination])
      throw new BadRequestError({
        message: `Secret sync with ID ${syncId} is not configured for ${SECRET_SYNC_NAME_MAP[syncDestination]}`
      });

    const { permission, ForbidOnInvalidProjectType } = await permissionService.getProjectPermission(
      actor.type,
      actor.id,
      secretSync.projectId,
      actor.authMethod,
      actor.orgId
    );

    ForbidOnInvalidProjectType(ProjectType.SecretManager);

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Edit, ProjectPermissionSub.SecretSync);

    const updatedSecretSync = await secretSyncDAL.transaction(async (tx) => {
      if (params.name && secretSync.name !== params.name) {
        const projectEnvironments = await projectEnvDAL.find({
          projectId: secretSync.projectId
        });

        const isConflictingName = Boolean(
          (
            await secretSyncDAL.find(
              {
                name: params.name,
                $in: {
                  envId: projectEnvironments.map((env) => env.id)
                }
              },
              tx
            )
          ).length
        );

        if (isConflictingName)
          throw new BadRequestError({
            message: `A Secret Sync with the name "${params.name}" already exists the project with ID ${secretSync.projectId}`
          });
      }

      const updatedSync = await secretSyncDAL.updateById(syncId, params);

      return updatedSync;
    });

    return updatedSecretSync;
  };

  const deleteSecretSync = async ({ syncDestination, syncId }: TDeleteSecretSyncDTO, actor: OrgServiceActor) => {
    await checkSecretSyncAvailability(actor.orgId);

    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync)
      throw new NotFoundError({
        message: `Could not find ${SECRET_SYNC_NAME_MAP[syncDestination]} Sync with ID ${syncId}`
      });

    const { permission, ForbidOnInvalidProjectType } = await permissionService.getProjectPermission(
      actor.type,
      actor.id,
      secretSync.projectId,
      actor.authMethod,
      actor.orgId
    );

    ForbidOnInvalidProjectType(ProjectType.SecretManager);

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Delete, ProjectPermissionSub.SecretSync);

    if (secretSync.connection.app !== SECRET_SYNC_CONNECTION_MAP[syncDestination])
      throw new BadRequestError({
        message: `Secret sync with ID ${syncId} is not configured for ${SECRET_SYNC_NAME_MAP[syncDestination]}`
      });

    // TODO: specify delete error message if due to existing dependencies

    const deletedSecretSync = await secretSyncDAL.deleteById(syncId);

    return deletedSecretSync;
  };

  return {
    listSecretSyncOptions,
    listSecretSyncsByProjectId,
    findSecretSyncById,
    findSecretSyncByName,
    createSecretSync,
    updateSecretSync,
    deleteSecretSync
  };
};
