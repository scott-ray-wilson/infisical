import { ForbiddenError } from "@casl/ability";

import { ProjectType } from "@app/db/schemas";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/ee/services/permission/project-permission";
import { TAppConnectionConfig } from "@app/lib/app-connections";
import { BadRequestError } from "@app/lib/errors";
import { OrgServiceActor } from "@app/lib/types";
import {
  encryptAppConnectionCredentials,
  validateAppConnectionCredentials
} from "@app/services/app-connection/app-connection-fns";
import { TAppConnectionServiceFactory } from "@app/services/app-connection/app-connection-service";

import { TSecretSyncDALFactory } from "./secret-sync-dal";
import { TCreateSecretSyncDTO } from "./secret-sync-types";

type TSecretSyncServiceFactoryDep = {
  secretSyncDAL: TSecretSyncDALFactory;
  appConnectionService: Pick<TAppConnectionServiceFactory, "utilizeAppConnectionById">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission">;
  licenseService: Pick<TLicenseServiceFactory, "getPlan">; // TODO: remove once launched
};

export type TSecretSyncServiceFactory = ReturnType<typeof secretSyncServiceFactory>;

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

  const createSecretSync = async (params: TCreateSecretSyncDTO, actor: OrgServiceActor) => {
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

    const isConflictingName = Boolean(
      await appConnectionDAL.findOne({
        name: params.name,
        orgId: actor.orgId
      })
    );

    if (isConflictingName)
      throw new BadRequestError({
        message: `An App Connection with the name "${params.name}" already exists`
      });

    const validatedCredentials = await validateAppConnectionCredentials({
      app,
      credentials,
      method,
      orgId: actor.orgId
    } as TAppConnectionConfig);

    const encryptedCredentials = await encryptAppConnectionCredentials({
      credentials: validatedCredentials,
      orgId: actor.orgId,
      kmsService
    });

    const appConnection = await appConnectionDAL.create({
      orgId: actor.orgId,
      encryptedCredentials,
      method,
      app,
      ...params
    });

    return { ...appConnection, credentials: validatedCredentials };
  };

  return {};
};
