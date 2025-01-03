import { TAwsParameterStoreSync } from "@app/hooks/api/secretSyncs/types/aws-parameter-store-sync";
import { TGitHubSync } from "@app/hooks/api/secretSyncs/types/github-sync";
import { TSecretSyncOption } from "@app/hooks/api/secretSyncs/types/sync-options";

export type TSecretSync = TAwsParameterStoreSync | TGitHubSync;

export type TListSecretSyncs = { secretSyncs: TSecretSync[] };

export type TListSecretSyncOptions = { secretSyncOptions: TSecretSyncOption[] };
export type TSecretSyncResponse = { secretSync: TSecretSync };

// export type TCreateAppConnectionDTO = Pick<
//   TAppConnection,
//   "name" | "credentials" | "method" | "app" | "description"
// >;
//
// export type TUpdateAppConnectionDTO = Partial<
//   Pick<TAppConnection, "name" | "credentials" | "description">
// > & {
//   connectionId: string;
//   app: AppConnection;
// };
//
// export type TDeleteAppConnectionDTO = {
//   app: AppConnection;
//   connectionId: string;
// };
//
// export type TAppConnectionMap = {
//   [AppConnection.AWS]: TAwsConnection;
//   [AppConnection.GitHub]: TGitHubConnection;
// };
