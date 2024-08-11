import { Knex } from "knex";

import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import { BadRequestError } from "@app/lib/errors";
import { ActorType } from "@app/services/auth/auth-type";
import {
  TCreateConsumerSecretDTO,
  TDeleteConsumerSecretsDTO,
  TGetConsumerSecretsDTO,
  TUpdateConsumerSecretsDTO
} from "@app/services/consumer-secret/consumer-secret-types";

import { TConsumerSecretDALFactory } from "./consumer-secret-dal";

type TConsumerSecretServiceFactoryDep = {
  consumerSecretDAL: TConsumerSecretDALFactory;
  permissionService: Pick<TPermissionServiceFactory, "getUserOrgPermission">;
};

export type TConsumerSecretServiceFactory = ReturnType<typeof consumerSecretServiceFactory>;

export const consumerSecretServiceFactory = ({
  consumerSecretDAL,
  permissionService
}: TConsumerSecretServiceFactoryDep) => {
  const createConsumerSecret = async ({
    actor,
    actorId,
    actorOrgId,
    actorAuthMethod,
    secretName,
    ...input
  }: TCreateConsumerSecretDTO) => {
    await permissionService.getUserOrgPermission(actorId, input.orgId, actorAuthMethod, actorOrgId);

    if (actor !== ActorType.USER) {
      throw new BadRequestError({ message: "Must be user to create consumer secret" });
    }

    // TODO: blind index

    const consumerSecret = await consumerSecretDAL.create({
      ...input,
      userId: actorId
    });

    return consumerSecret;
  };

  const getConsumerSecrets = async (
    { actor, actorId, actorOrgId, actorAuthMethod, orgId }: TGetConsumerSecretsDTO,
    tx?: Knex
  ) => {
    await permissionService.getUserOrgPermission(actorId, orgId, actorAuthMethod, actorOrgId);

    if (actor !== ActorType.USER) {
      throw new BadRequestError({ message: "Must be user to get personal consumer secrets" });
    }

    const consumerSecrets = await consumerSecretDAL.getUserConsumerSecretsForOrg(actorId, orgId, tx);

    return consumerSecrets;
  };

  const deleteConsumerSecret = async (
    { actor, actorId, actorOrgId, actorAuthMethod, orgId, consumerSecretId }: TDeleteConsumerSecretsDTO,
    tx?: Knex
  ) => {
    await permissionService.getUserOrgPermission(actorId, orgId, actorAuthMethod, actorOrgId);

    if (actor !== ActorType.USER) {
      throw new BadRequestError({ message: "Must be user to delete personal consumer secrets" });
    }

    const deletedConsumerSecret = await consumerSecretDAL.delete(
      {
        // ensure secret is attached to user/org
        userId: actorId,
        orgId,
        id: consumerSecretId
      },
      tx
    );

    return deletedConsumerSecret;
  };

  const updateConsumerSecret = async (
    { actor, actorId, actorOrgId, actorAuthMethod, orgId, consumerSecretId, ...input }: TUpdateConsumerSecretsDTO,
    tx?: Knex
  ) => {
    await permissionService.getUserOrgPermission(actorId, orgId, actorAuthMethod, actorOrgId);

    if (actor !== ActorType.USER) {
      throw new BadRequestError({ message: "Must be user to update personal consumer secrets" });
    }

    const updatedConsumerSecret = await consumerSecretDAL.update(
      {
        // ensure secret is attached to user/org
        userId: actorId,
        orgId,
        id: consumerSecretId // TODO: remove once blind index implemented
      },
      input,
      tx
    );

    return updatedConsumerSecret;
  };

  return {
    createConsumerSecret,
    deleteConsumerSecret,
    getConsumerSecrets,
    updateConsumerSecret
  };
};
