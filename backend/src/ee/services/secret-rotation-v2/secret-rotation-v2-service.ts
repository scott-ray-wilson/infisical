import { ForbiddenError, subject } from "@casl/ability";

import { ActionProjectType } from "@app/db/schemas";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import {
  ProjectPermissionSecretActions,
  ProjectPermissionSecretRotationActions,
  ProjectPermissionSub
} from "@app/ee/services/permission/project-permission";
import {
  decryptSecretRotationCredentials,
  encryptSecretRotationCredentials,
  listSecretRotationOptions
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-fns";
import {
  SECRET_ROTATION_CONNECTION_MAP,
  SECRET_ROTATION_FACTORY_MAP,
  SECRET_ROTATION_NAME_MAP
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-maps";
import {
  TCreateSecretRotationV2DTO,
  TDeleteSecretRotationV2DTO,
  TFindSecretRotationV2ByIdDTO,
  TFindSecretRotationV2ByNameDTO,
  TListSecretRotationsV2ByProjectId,
  TSecretRotationV2,
  TSecretRotationV2GeneratedCredentials,
  TSecretRotationV2WithConnection,
  TUpdateSecretRotationV2DTO
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { DatabaseErrorCode } from "@app/lib/error-codes";
import { BadRequestError, DatabaseError, NotFoundError } from "@app/lib/errors";
import { OrgServiceActor } from "@app/lib/types";
import { TAppConnectionServiceFactory } from "@app/services/app-connection/app-connection-service";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";
import { TProjectBotServiceFactory } from "@app/services/project-bot/project-bot-service";
import { TSecretFolderDALFactory } from "@app/services/secret-folder/secret-folder-dal";

import { TSecretRotationV2DALFactory } from "./secret-rotation-v2-dal";

type TSecretRotationV2ServiceFactoryDep = {
  secretRotationV2DAL: TSecretRotationV2DALFactory;
  appConnectionService: Pick<TAppConnectionServiceFactory, "connectAppConnectionById">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission" | "getOrgPermission">;
  projectBotService: Pick<TProjectBotServiceFactory, "getBotKey">;
  folderDAL: Pick<TSecretFolderDALFactory, "findByProjectId" | "findById" | "findBySecretPath">;
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey">;
  licenseService: Pick<TLicenseServiceFactory, "getPlan">;
};

export type TSecretRotationV2ServiceFactory = ReturnType<typeof secretRotationV2ServiceFactory>;

export const secretRotationV2ServiceFactory = ({
  secretRotationV2DAL,
  folderDAL,
  permissionService,
  appConnectionService,
  projectBotService,
  licenseService,
  kmsService
}: TSecretRotationV2ServiceFactoryDep) => {
  const listSecretRotationsByProjectId = async (
    { projectId, type }: TListSecretRotationsV2ByProjectId,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotations due to plan restriction. Upgrade plan to access secret rotations."
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      ProjectPermissionSub.SecretRotation
    );

    const secretRotations = await secretRotationV2DAL.find({
      ...(type && { type }),
      projectId
    });

    return secretRotations as TSecretRotationV2[];
  };

  const findSecretRotationById = async ({ type, rotationId }: TFindSecretRotationV2ByIdDTO, actor: OrgServiceActor) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    return secretRotation as TSecretRotationV2;
  };

  const findSecretRotationGeneratedCredentialsById = async (
    { type, rotationId }: TFindSecretRotationV2ByIdDTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message:
          "Failed to access secret rotation credentials due to plan restriction. Upgrade plan to access secret rotations credentials."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.ReadCredentials,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    const generatedCredentials = await decryptSecretRotationCredentials({
      projectId: secretRotation.projectId,
      encryptedGeneratedCredentials: secretRotation.encryptedGeneratedCredentials,
      kmsService
    });

    return { generatedCredentials, activeIndex: secretRotation.activeIndex };
  };

  const findSecretRotationByName = async (
    { type, rotationName, projectId }: TFindSecretRotationV2ByNameDTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
      });

    // we prevent conflicting names within a project
    const secretRotation = await secretRotationV2DAL.findOne({
      name: rotationName,
      projectId
    });

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with name "${rotationName}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    return secretRotation as TSecretRotationV2;
  };

  const createSecretRotation = async (
    { projectId, secretPath, environment, ...params }: TCreateSecretRotationV2DTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to create secret rotation due to plan restriction. Upgrade plan to create secret rotations."
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId
    });

    const { shouldUseSecretV2Bridge } = await projectBotService.getBotKey(projectId);

    if (!shouldUseSecretV2Bridge)
      throw new BadRequestError({ message: "Project version does not support Secret Rotation V2" });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Create,
      ProjectPermissionSub.SecretRotation
    );

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretActions.Create,
      subject(ProjectPermissionSub.Secrets, { environment, secretPath })
    );

    const folder = await folderDAL.findBySecretPath(projectId, environment, secretPath);

    if (!folder)
      throw new BadRequestError({
        message: `Could not find folder with path "${secretPath}" in environment "${environment}" for project with ID "${projectId}"`
      });

    const typeApp = SECRET_ROTATION_CONNECTION_MAP[params.type];

    // validates permission to connect and app is valid for sync type
    const appConnection = await appConnectionService.connectAppConnectionById(typeApp, params.connectionId, actor);

    // TODO: check if secrets exist

    const generatedCredentials: TSecretRotationV2GeneratedCredentials = [];

    try {
      const rotationFactory = SECRET_ROTATION_FACTORY_MAP[params.type]({
        parameters: params.parameters,
        connection: appConnection
      } as TSecretRotationV2WithConnection);

      const credentials = await rotationFactory.issue();

      generatedCredentials.push(credentials);
    } catch (error) {
      throw new BadRequestError({
        message: `Failed to generate credentials for secret rotation: ${(error as Error)?.message ?? "Unknown error"}`
      });
    }

    const encryptedGeneratedCredentials = await encryptSecretRotationCredentials({
      generatedCredentials,
      projectId,
      kmsService
    });

    try {
      const secretRotation = await secretRotationV2DAL.create({
        folderId: folder.id,
        ...params,
        encryptedGeneratedCredentials,
        projectId
      });

      // TODO: test with derivations

      return secretRotation as TSecretRotationV2;
    } catch (err) {
      if (err instanceof DatabaseError && (err.error as { code: string })?.code === DatabaseErrorCode.UniqueViolation) {
        throw new BadRequestError({
          message: `A Secret Rotation with the name "${params.name}" already exists for the project with ID "${folder.projectId}"`
        });
      }

      throw err;
    }
  };

  const updateSecretRotation = async (
    { type, rotationId, secretPath, environment, ...params }: TUpdateSecretRotationV2DTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to update secret rotation due to plan restriction. Upgrade plan to update secret rotations."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID ${rotationId}`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Edit,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret sync with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    let { folderId } = secretRotation;

    if (
      (secretPath && secretPath !== secretRotation.folder?.path) ||
      (environment && environment !== secretRotation.environment?.slug)
    ) {
      const updatedEnvironment = environment ?? secretRotation.environment?.slug;
      const updatedSecretPath = secretPath ?? secretRotation.folder?.path;

      if (!updatedEnvironment || !updatedSecretPath)
        throw new BadRequestError({ message: "Must specify both source environment and secret path" });

      // TODO: get secrets to determine delete permission

      // ForbiddenError.from(permission).throwUnlessCan(
      //     ProjectPermissionSecretActions.Create,
      //     subject(ProjectPermissionSub.Secrets, { environment, secretPath })
      // );

      ForbiddenError.from(permission).throwUnlessCan(
        ProjectPermissionSecretActions.Create,
        subject(ProjectPermissionSub.Secrets, { environment: updatedEnvironment, secretPath: updatedSecretPath })
      );

      const newFolder = await folderDAL.findBySecretPath(
        secretRotation.projectId,
        updatedEnvironment,
        updatedSecretPath
      );

      if (!newFolder)
        throw new BadRequestError({
          message: `Could not find folder with path "${secretPath}" in environment "${environment}" for project with ID "${secretRotation.projectId}"`
        });

      folderId = newFolder.id;
    }

    try {
      const updatedSecretRotation = await secretRotationV2DAL.updateById(rotationId, {
        ...params,
        folderId
      });

      return updatedSecretRotation as TSecretRotationV2;
    } catch (err) {
      if (err instanceof DatabaseError && (err.error as { code: string })?.code === DatabaseErrorCode.UniqueViolation) {
        throw new BadRequestError({
          message: `A Secret Rotation with the name "${params.name}" already exists for the project with ID "${secretRotation.projectId}"`
        });
      }

      throw err;
    }
  };

  const deleteSecretRotation = async (
    { type, rotationId, removeSecrets }: TDeleteSecretRotationV2DTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Delete,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret sync with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    if (removeSecrets) {
      // TODO: get secrets to determine remove permissions
      // ForbiddenError.from(permission).throwUnlessCan(
      //   ProjectPermissionSecretRotationActions.RemoveSecrets,
      //   ProjectPermissionSub.SecretRotations
      // );
      // TODO: remove secrets
    } else {
      // TODO delete relations
    }

    await secretRotationV2DAL.deleteById(rotationId);

    return secretRotation as TSecretRotationV2;
  };

  return {
    listSecretRotationOptions,
    listSecretRotationsByProjectId,
    createSecretRotation,
    updateSecretRotation,
    findSecretRotationById,
    findSecretRotationByName,
    deleteSecretRotation,
    findSecretRotationGeneratedCredentialsById
    // triggerSecretRotationRotationSecretsById,
    // triggerSecretRotationImportSecretsById,
    // triggerSecretRotationRemoveSecretsById
  };
};
