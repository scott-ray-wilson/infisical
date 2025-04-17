import ldap from "ldapjs";

import { BadRequestError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { blockLocalAndPrivateIpAddresses } from "@app/lib/validator";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

import { LdapConnectionMethod } from "./ldap-connection-enums";
import { TLdapConnectionConfig } from "./ldap-connection-types";

export const getLdapConnectionListItem = () => {
  return {
    name: "LDAP" as const,
    app: AppConnection.LDAP as const,
    methods: Object.values(LdapConnectionMethod) as [LdapConnectionMethod.SimpleBind]
  };
};

const getLdapConnectionClient = async ({
  url,
  username,
  password,
  sslCertificate,
  sslRejectUnauthorized
}: TLdapConnectionConfig["credentials"]) => {
  await blockLocalAndPrivateIpAddresses(url);

  const isSSL = url.startsWith("ldaps");

  return new Promise<ldap.Client>((resolve, reject) => {
    logger.warn(
      isSSL
        ? {
            rejectUnauthorized: sslRejectUnauthorized,
            ca: sslCertificate ? [sslCertificate] : undefined,
            servername: ""
          }
        : undefined,
      "sslCert"
    );

    const client = ldap.createClient({
      bindDN: username,
      bindCredentials: password,
      url,
      timeout: 15_000,
      connectTimeout: 15_000,
      tlsOptions: isSSL
        ? {
            rejectUnauthorized: sslRejectUnauthorized,
            ca: sslCertificate ? [sslCertificate] : undefined,
            servername: "dc-01.scott-test.local"
          }
        : undefined
    });

    client.on("error", (err: Error) => {
      logger.error(err, "LDAP Error");
      reject(new Error(`Provider Error: ${err.message}`));
    });

    client.on("connectError", (err: Error) => {
      logger.error(err, "LDAP Connection Error");
      client.destroy();
      reject(new Error(`Provider Connect Error: ${err.message}`));
    });

    client.on("connectRefused", (err: Error) => {
      logger.error(err, "LDAP Connection Refused");
      client.destroy();
      reject(new Error(`Provider Connection Refused: ${err.message}`));
    });

    client.on("connectTimeout", (err: Error) => {
      logger.error(err, "LDAP Connection Timeout");
      client.destroy();
      reject(new Error(`Connection Timeout: ${err.message}`));
    });

    client.on("connect", () => {
      logger.warn("LDAP Connected");
      resolve(client);
    });
  });
};

export const validateLdapConnectionCredentials = async ({ credentials }: TLdapConnectionConfig) => {
  try {
    const client = await getLdapConnectionClient(credentials);

    return credentials;
  } catch (e: unknown) {
    throw new BadRequestError({
      message: (e as Error).message ?? `Unable to validate connection: verify credentials`
    });
  }
};
