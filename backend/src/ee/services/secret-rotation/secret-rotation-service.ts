import { ForbiddenError } from "@casl/ability";

import { ActionProjectType } from "@app/db/schemas";
import { decryptSymmetric128BitHexKeyUTF8 } from "@app/lib/crypto/encryption";
import { BadRequestError, NotFoundError } from "@app/lib/errors";
import { TProjectPermission } from "@app/lib/types";
import { TProjectDALFactory } from "@app/services/project/project-dal";
import { TProjectBotServiceFactory } from "@app/services/project-bot/project-bot-service";

import { TLicenseServiceFactory } from "../license/license-service";
import { TPermissionServiceFactory } from "../permission/permission-service";
import { ProjectPermissionSecretRotationActions, ProjectPermissionSub } from "../permission/project-permission";
import { TSecretRotationDALFactory } from "./secret-rotation-dal";
import { TSecretRotationQueueFactory } from "./secret-rotation-queue";
import { TDeleteDTO, TListByProjectIdDTO, TRestartDTO } from "./secret-rotation-types";
import { rotationTemplates } from "./templates";

type TSecretRotationServiceFactoryDep = {
  secretRotationDAL: TSecretRotationDALFactory;
  projectDAL: Pick<TProjectDALFactory, "findById">;
  licenseService: Pick<TLicenseServiceFactory, "getPlan">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission">;
  secretRotationQueue: TSecretRotationQueueFactory;
  projectBotService: Pick<TProjectBotServiceFactory, "getBotKey">;
};

export type TSecretRotationServiceFactory = ReturnType<typeof secretRotationServiceFactory>;

export const secretRotationServiceFactory = ({
  secretRotationDAL,
  permissionService,
  secretRotationQueue,
  licenseService,
  projectDAL,
  projectBotService
}: TSecretRotationServiceFactoryDep) => {
  const getProviderTemplates = async ({
    actor,
    actorId,
    actorOrgId,
    actorAuthMethod,
    projectId
  }: TProjectPermission) => {
    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.SecretManager
    });
    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      ProjectPermissionSub.SecretRotation
    );

    return {
      custom: [],
      providers: rotationTemplates
    };
  };

  const getByProjectId = async ({ actorId, projectId, actor, actorOrgId, actorAuthMethod }: TListByProjectIdDTO) => {
    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.SecretManager
    });
    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      ProjectPermissionSub.SecretRotation
    );
    const { botKey, shouldUseSecretV2Bridge } = await projectBotService.getBotKey(projectId);
    if (shouldUseSecretV2Bridge) {
      const docs = await secretRotationDAL.findSecretV2({ projectId });
      return docs;
    }

    if (!botKey) throw new NotFoundError({ message: `Project bot not found for project with ID '${projectId}'` });
    const docs = await secretRotationDAL.find({ projectId });
    return docs.map((el) => ({
      ...el,
      outputs: el.outputs.map((output) => ({
        ...output,
        secret: {
          id: output.secret.id,
          version: output.secret.version,
          secretKey: decryptSymmetric128BitHexKeyUTF8({
            ciphertext: output.secret.secretKeyCiphertext,
            iv: output.secret.secretKeyIV,
            tag: output.secret.secretKeyTag,
            key: botKey
          })
        }
      }))
    }));
  };

  const restartById = async ({ actor, actorId, actorOrgId, actorAuthMethod, rotationId }: TRestartDTO) => {
    const doc = await secretRotationDAL.findById(rotationId);
    if (!doc) throw new NotFoundError({ message: `Rotation with ID '${rotationId}' not found` });

    const project = await projectDAL.findById(doc.projectId);
    const plan = await licenseService.getPlan(project.orgId);
    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to add secret rotation due to plan restriction. Upgrade plan to add secret rotation."
      });

    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId: project.id,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.SecretManager
    });
    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Edit,
      ProjectPermissionSub.SecretRotation
    );
    await secretRotationQueue.removeFromQueue(doc.id, doc.interval);
    await secretRotationQueue.addToQueue(doc.id, doc.interval);
    return doc;
  };

  const deleteById = async ({ actor, actorId, actorOrgId, actorAuthMethod, rotationId }: TDeleteDTO) => {
    const doc = await secretRotationDAL.findById(rotationId);
    if (!doc) throw new NotFoundError({ message: `Rotation with ID '${rotationId}' not found` });

    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId: doc.projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.SecretManager
    });
    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Delete,
      ProjectPermissionSub.SecretRotation
    );
    const deletedDoc = await secretRotationDAL.transaction(async (tx) => {
      const strat = await secretRotationDAL.deleteById(rotationId, tx);
      return strat;
    });
    await secretRotationQueue.removeFromQueue(deletedDoc.id, deletedDoc.interval);
    return { ...doc, ...deletedDoc };
  };

  return {
    getProviderTemplates,
    getByProjectId,
    restartById,
    deleteById
  };
};
