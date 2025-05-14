import { TDbClient } from "@app/db";
import { TableName } from "@app/db/schemas";
import { ormify } from "@app/lib/knex";

export type TSecretScanningV2DALFactory = ReturnType<typeof secretScanningV2DALFactory>;

export const secretScanningV2DALFactory = (db: TDbClient) => {
  const sourceOrm = ormify(db, TableName.SecretScanningSource);
  const targetOrm = ormify(db, TableName.SecretScanningTarget);
  const scanOrm = ormify(db, TableName.SecretScanningScan);
  const findingOrm = ormify(db, TableName.SecretScanningFinding);

  return {
    source: sourceOrm,
    target: targetOrm,
    scan: scanOrm,
    finding: findingOrm
  };
};
