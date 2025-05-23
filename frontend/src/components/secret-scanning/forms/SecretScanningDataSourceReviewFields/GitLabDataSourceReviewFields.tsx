import { useFormContext } from "react-hook-form";

import { GenericFieldLabel } from "@app/components/v2";
import { SecretScanningDataSource } from "@app/hooks/api/secretScanningV2";

import { TSecretScanningDataSourceForm } from "../schemas";
import { SecretScanningDataSourceConfigReviewSection } from "./shared";

export const GitLabDataSourceReviewFields = () => {
  const { watch } = useFormContext<
    TSecretScanningDataSourceForm & {
      type: SecretScanningDataSource.GitLab;
    }
  >();

  const [{ includeProjects }, connection] = watch(["config", "connection"]);
  const shouldScanAll = includeProjects[0] === "*";

  return (
    <SecretScanningDataSourceConfigReviewSection>
      {connection && <GenericFieldLabel label="Connection">{connection.name}</GenericFieldLabel>}
      <GenericFieldLabel label="Scan Projects">
        {shouldScanAll ? "All" : includeProjects.join(", ")}
      </GenericFieldLabel>
    </SecretScanningDataSourceConfigReviewSection>
  );
};
