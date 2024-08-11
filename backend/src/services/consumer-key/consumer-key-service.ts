import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import { assignConsumerKeysToOrgMembers, createConsumerKey } from "@app/services/consumer-key/consumer-key-fns";
import { TGetLatestConsumerKeyDTO } from "@app/services/consumer-key/consumer-key-types";
import { TOrgServiceFactory } from "@app/services/org/org-service";
import { TUserDALFactory } from "@app/services/user/user-dal";

import { TConsumerKeyDALFactory } from "./consumer-key-dal";

type TConsumerKeyServiceFactoryDep = {
  consumerKeyDAL: TConsumerKeyDALFactory;
  orgService: TOrgServiceFactory;
  permissionService: TPermissionServiceFactory;
  userDAL: TUserDALFactory;
};

export type TConsumerKeyServiceFactory = ReturnType<typeof consumerKeyServiceFactory>;

export const consumerKeyServiceFactory = ({
  consumerKeyDAL,
  orgService,
  permissionService,
  userDAL
}: TConsumerKeyServiceFactoryDep) => {
  const internalCreateRootConsumerKey = async ({ orgId, userId }: { orgId: string; userId: string }) => {
    await consumerKeyDAL.transaction(async (tx) => {
      // create consumer key for org
      const ghostUser = await orgService.addGhostUser(orgId, tx);

      // create a random key that we'll use as the org consumer key.
      const { key: encryptedProjectKey, iv: encryptedProjectKeyIv } = createConsumerKey({
        publicKey: ghostUser.keys.publicKey,
        privateKey: ghostUser.keys.plainPrivateKey
      });

      // save the org consumer key for the ghost user
      await consumerKeyDAL.create(
        {
          orgId,
          receiverId: ghostUser.user.id,
          encryptedKey: encryptedProjectKey,
          nonce: encryptedProjectKeyIv,
          senderId: ghostUser.user.id
        },
        tx
      );

      // Find the ghost users latest key
      const latestKey = await consumerKeyDAL.findLatestConsumerKey(ghostUser.user.id, orgId, tx);

      if (!latestKey) {
        throw new Error("Latest consumer key not found");
      }

      // Find public key of user
      const user = await userDAL.findUserEncKeyByUserId(userId);

      if (!user) {
        throw new Error("User not found");
      }

      const [orgAdmin] = assignConsumerKeysToOrgMembers({
        decryptKey: latestKey,
        userPrivateKey: ghostUser.keys.plainPrivateKey,
        members: [
          {
            userPublicKey: user.publicKey,
            orgId,
            userId
          }
        ]
      });

      // Create a consumer key for the user
      await consumerKeyDAL.create(
        {
          encryptedKey: orgAdmin.consumerEncryptedKey,
          nonce: orgAdmin.consumerEncryptedNonce,
          senderId: ghostUser.user.id,
          receiverId: user.id,
          orgId
        },
        tx
      );
    });
  };

  const getLatestConsumerKey = async ({ actorId, orgId, actorOrgId, actorAuthMethod }: TGetLatestConsumerKeyDTO) => {
    await permissionService.getUserOrgPermission(actorId, orgId, actorAuthMethod, actorOrgId);
    const latestKey = await consumerKeyDAL.findLatestConsumerKey(actorId, orgId);
    return latestKey;
  };

  return {
    createRootConsumerKey: internalCreateRootConsumerKey,
    getLatestConsumerKey
  };
};
