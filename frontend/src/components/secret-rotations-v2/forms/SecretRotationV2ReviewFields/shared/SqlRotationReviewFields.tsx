import { useFormContext } from "react-hook-form";

import { TSecretRotationV2Form } from "@app/components/secret-rotations-v2/forms/schemas";
import { GenericFieldLabel } from "@app/components/v2";
import { SecretRotation } from "@app/hooks/api/secretRotationsV2";

export const SqlRotationReviewFields = () => {
  const { watch } = useFormContext<
    TSecretRotationV2Form & {
      type: SecretRotation.PostgresCredentials; // all sql rotations share these fields
    }
  >();

  const [{ issueStatement, revokeStatement }, { username, password }] = watch([
    "parameters",
    "secretsMapping"
  ]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="w-full border-b border-mineshaft-600">
          <span className="text-sm text-mineshaft-300">Parameters</span>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <GenericFieldLabel label="Issue Statement">
            <pre className="max-h-[4rem] overflow-y-auto whitespace-pre-wrap rounded border border-mineshaft-600 bg-mineshaft-700 p-2 font-inter text-bunker-100">
              {issueStatement}
            </pre>
          </GenericFieldLabel>
          <GenericFieldLabel label="Revoke Statement">
            <pre className="max-h-[4rem] overflow-y-auto whitespace-pre-wrap rounded border border-mineshaft-600 bg-mineshaft-700 p-2 font-inter text-bunker-100">
              {revokeStatement}
            </pre>
          </GenericFieldLabel>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="w-full border-b border-mineshaft-600">
          <span className="text-sm text-mineshaft-300">Secrets Mapping</span>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <GenericFieldLabel label="Username">{username}</GenericFieldLabel>
          <GenericFieldLabel label="Password">{password}</GenericFieldLabel>
        </div>
      </div>
    </>
  );
};
