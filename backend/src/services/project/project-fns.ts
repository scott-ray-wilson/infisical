import crypto from "crypto";

import { ProjectMembershipRole, ProjectVersion, TProjects } from "@app/db/schemas";
import { TFeatureSet } from "@app/ee/services/license/license-types";
import { decryptAsymmetric, encryptAsymmetric } from "@app/lib/crypto";
import { BadRequestError, NotFoundError } from "@app/lib/errors";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";
import { TProjectDALFactory } from "@app/services/project/project-dal";
import { TProjectRoleDALFactory } from "@app/services/project-role/project-role-dal";

import { AddUserToWsDTO } from "./project-types";

export const assignWorkspaceKeysToMembers = ({ members, decryptKey, userPrivateKey }: AddUserToWsDTO) => {
  const plaintextProjectKey = decryptAsymmetric({
    ciphertext: decryptKey.encryptedKey,
    nonce: decryptKey.nonce,
    publicKey: decryptKey.sender.publicKey,
    privateKey: userPrivateKey
  });

  const newWsMembers = members.map(({ orgMembershipId, userPublicKey }) => {
    const { ciphertext: inviteeCipherText, nonce: inviteeNonce } = encryptAsymmetric(
      plaintextProjectKey,
      userPublicKey,
      userPrivateKey
    );

    return {
      orgMembershipId,
      workspaceEncryptedKey: inviteeCipherText,
      workspaceEncryptedNonce: inviteeNonce
    };
  });

  return newWsMembers;
};

type TCreateProjectKeyDTO = {
  publicKey: string;
  privateKey: string;
  plainProjectKey?: string;
};

export const createProjectKey = ({ publicKey, privateKey, plainProjectKey }: TCreateProjectKeyDTO) => {
  // 3. Create a random key that we'll use as the project key.
  const randomBytes = plainProjectKey || crypto.randomBytes(16).toString("hex");

  // 4. Encrypt the project key with the users key pair.
  const { ciphertext: encryptedProjectKey, nonce: encryptedProjectKeyIv } = encryptAsymmetric(
    randomBytes,
    publicKey,
    privateKey
  );

  return { key: encryptedProjectKey, iv: encryptedProjectKeyIv };
};

export const verifyProjectVersions = (projects: Pick<TProjects, "version">[], version: ProjectVersion) => {
  for (const project of projects) {
    if (project.version !== version) {
      return false;
    }
  }

  return true;
};

export const getProjectKmsCertificateKeyId = async ({
  projectId,
  projectDAL,
  kmsService
}: {
  projectId: string;
  projectDAL: Pick<TProjectDALFactory, "findOne" | "updateById" | "transaction">;
  kmsService: Pick<TKmsServiceFactory, "generateKmsKey">;
}) => {
  const keyId = await projectDAL.transaction(async (tx) => {
    const project = await projectDAL.findOne({ id: projectId }, tx);
    if (!project) {
      throw new NotFoundError({ message: "Project not found" });
    }

    if (!project.kmsCertificateKeyId) {
      // create default kms key for certificate service
      const key = await kmsService.generateKmsKey({
        isReserved: true,
        orgId: project.orgId,
        tx
      });

      await projectDAL.updateById(
        projectId,
        {
          kmsCertificateKeyId: key.id
        },
        tx
      );

      return key.id;
    }

    return project.kmsCertificateKeyId;
  });

  return keyId;
};

// filter custom because this should never be passed; only reserved role slug or custom role ID
const RESERVED_PROJECT_ROLES = Object.values(ProjectMembershipRole).filter((role) => role !== "custom");

// this is only for use when updating a project
export const getDefaultProjectMembershipRoleForUpdateProject = async ({
  membershipRoleSlug,
  projectRoleDAL,
  plan,
  projectId
}: {
  projectId: string;
  membershipRoleSlug: string;
  projectRoleDAL: TProjectRoleDALFactory;
  plan: TFeatureSet;
}) => {
  const isCustomRole = !RESERVED_PROJECT_ROLES.includes(membershipRoleSlug as ProjectMembershipRole);

  if (isCustomRole) {
    // verify rbac enabled
    if (!plan?.rbac)
      throw new BadRequestError({
        message:
          "Failed to set custom default role due to plan RBAC restriction. Upgrade plan to set custom default org membership role."
      });

    // check that custom role exists
    const customRole = await projectRoleDAL.findOne({ slug: membershipRoleSlug, projectId });
    if (!customRole) throw new BadRequestError({ name: "UpdateProject", message: "Project role not found" });

    // use ID for default role
    return customRole.id;
  }

  // not custom, use reserved slug
  return membershipRoleSlug;
};

// this is only for use when creating a project membership
export const getDefaultProjectMembershipRoleDto = async (
  defaultProjectMembershipRole: string // can either be ID or reserved slug
) => {
  const isCustomRole = !RESERVED_PROJECT_ROLES.includes(defaultProjectMembershipRole as ProjectMembershipRole);

  if (isCustomRole)
    return {
      roleId: defaultProjectMembershipRole,
      role: ProjectMembershipRole.Custom
    };

  // will be reserved slug
  return { roleId: undefined, role: defaultProjectMembershipRole as ProjectMembershipRole };
};
