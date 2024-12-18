import { ForbiddenError } from "@casl/ability";

import { ProjectType } from "@app/db/schemas";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/ee/services/permission/project-permission";
import { AppConnection, TAppConnection } from "@app/lib/app-connections";
import { APP_CONNECTION_NAME_MAP } from "@app/lib/app-connections/maps";
import { BadRequestError, InternalServerError, NotFoundError } from "@app/lib/errors";
import { SECRET_SYNC_NAME_MAP, SecretSync } from "@app/lib/secret-syncs";
import { OrgServiceActor } from "@app/lib/types";
import { TAppConnectionServiceFactory } from "@app/services/app-connection/app-connection-service";

import { TSecretSyncDALFactory } from "./secret-sync-dal";
import {
  TCreateSecretSyncDTO,
  TDeleteSecretSyncDTO,
  TFindSecretSyncByIdDTO,
  TFindSecretSyncByNameDTO,
  TListSecretSyncsByProjectId,
  TUpdateSecretSyncDTO
} from "./secret-sync-types";

type TSecretSyncServiceFactoryDep = {
  secretSyncDAL: TSecretSyncDALFactory;
  appConnectionService: Pick<TAppConnectionServiceFactory, "utilizeAppConnectionById">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission">;
  licenseService: Pick<TLicenseServiceFactory, "getPlan">; // TODO: remove once launched
};

export type TSecretSyncServiceFactory = ReturnType<typeof secretSyncServiceFactory>;

const SECRET_SYNC_CONNECTION_MAP: Record<SecretSync, AppConnection> = {
  [SecretSync.AWSParameterStore]: AppConnection.AWS
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

    const secretSyncs = await secretSyncDAL.find({ projectId });

    return secretSyncs;
  };

  const findSecretSyncById = async ({ syncDestination, syncId }: TFindSecretSyncByIdDTO, actor: OrgServiceActor) => {
    await checkSecretSyncAvailability(actor.orgId);

    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync)
      throw new NotFoundError({
        message: `Could not find ${SECRET_SYNC_NAME_MAP[syncDestination]} Sync with ID ${syncId}`
      });

    if (secretSync.connection.app !== SECRET_SYNC_CONNECTION_MAP[syncDestination])
      // TODO: further differentiate for sub-services
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

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Read, ProjectPermissionSub.SecretSync);

    return secretSync;
  };

  const findSecretSyncByName = async (
    { syncDestination, syncName, projectId }: TFindSecretSyncByNameDTO,
    actor: OrgServiceActor
  ) => {
    await checkSecretSyncAvailability(actor.orgId);

    const secretSync = await secretSyncDAL.findOne({
      name: syncName,
      projectId
    });

    if (!secretSync)
      throw new NotFoundError({
        message: `Could not find ${SECRET_SYNC_NAME_MAP[syncDestination]} Sync with name ${syncName}`
      });

    if (secretSync.connection.app !== SECRET_SYNC_CONNECTION_MAP[syncDestination])
      // TODO: further differentiate for sub-services
      throw new BadRequestError({
        message: `Secret sync with name ${syncName} is not configured for ${SECRET_SYNC_NAME_MAP[syncDestination]}`
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

    return secretSync;
  };

  const createSecretSync = async ({ syncDestination, ...params }: TCreateSecretSyncDTO, actor: OrgServiceActor) => {
    await checkSecretSyncAvailability(actor.orgId);

    const { permission, ForbidOnInvalidProjectType } = await permissionService.getProjectPermission(
      actor.type,
      actor.id,
      params.projectId,
      actor.authMethod,
      actor.orgId
    );

    ForbidOnInvalidProjectType(ProjectType.SecretManager);

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Create, ProjectPermissionSub.SecretSync);

    const appConnection = await appConnectionService.utilizeAppConnectionById(params.connectionId);

    BadRequestOnInvalidConnectionForSync(syncDestination, appConnection);

    const isConflictingName = Boolean(
      await secretSyncDAL.findOne({
        name: params.name,
        projectId: params.projectId
      })
    );

    if (isConflictingName)
      throw new BadRequestError({
        message: `An App Connection with the name "${params.name}" already exists`
      });

    const secretSync = await secretSyncDAL.create(params);

    return secretSync;
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

    if (params.name && secretSync.name !== params.name) {
      const isConflictingName = Boolean(
        await secretSyncDAL.findOne({
          name: params.name,
          projectId: secretSync.projectId
        })
      );

      if (isConflictingName)
        throw new BadRequestError({
          message: `A Secret Sync with the name "${params.name}" already exists for this project`
        });
    }
    const updatedSecretSync = await secretSyncDAL.updateById(syncId, params);

    return updatedSecretSync;
  };

  const deleteSecretSync = async ({ syncDestination, syncId }: TDeleteSecretSyncDTO, actor: OrgServiceActor) => {
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

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Delete, ProjectPermissionSub.SecretSync);

    // TODO: specify delete error message if due to existing dependencies

    const deletedSecretSync = await secretSyncDAL.deleteById(syncId);

    return deletedSecretSync;
  };

  return {
    findSecretSyncById,
    findSecretSyncByName,
    createSecretSync,
    updateSecretSync,
    deleteSecretSync,
    listSecretSyncsByProjectId
  };
};
