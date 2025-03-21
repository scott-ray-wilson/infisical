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

  const { usernameSecretKey, passwordSecretKey, issueStatement, revokeStatement } =
    watch("parameters");

  return (
    <>
      <GenericFieldLabel label="Username Secret Key">{usernameSecretKey}</GenericFieldLabel>
      <GenericFieldLabel label="Password Secret Key">{passwordSecretKey}</GenericFieldLabel>
      <GenericFieldLabel label="Issue Statement">
        <pre className="whitespace-pre-wrap rounded border border-mineshaft-600 bg-mineshaft-700 p-2 font-inter text-bunker-100">
          {issueStatement}
        </pre>
      </GenericFieldLabel>
      <GenericFieldLabel label="Revoke Statement">
        <pre className="whitespace-pre-wrap rounded border border-mineshaft-600 bg-mineshaft-700 p-2 font-inter text-bunker-100">
          {revokeStatement}
        </pre>
      </GenericFieldLabel>
    </>
  );
};
