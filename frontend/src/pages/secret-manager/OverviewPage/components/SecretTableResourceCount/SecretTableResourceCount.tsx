import {
  faFileImport,
  faFingerprint,
  faFolder,
  faKey,
  faRotate
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Tooltip } from "@app/components/v2";
import { FolderIcon, ImportIcon, KeyIcon } from "lucide-react";

type Props = {
  folderCount?: number;
  importCount?: number;
  secretCount?: number;
  dynamicSecretCount?: number;
  secretRotationCount?: number;
};

export const SecretTableResourceCount = ({
  folderCount = 0,
  dynamicSecretCount = 0,
  secretCount = 0,
  importCount = 0,
  secretRotationCount = 0
}: Props) => {
  return (
    <div className="flex items-center divide-x divide-mineshaft-500 text-sm text-mineshaft-400 [&>*]:pr-2">
      {importCount > 0 && (
        <Tooltip
          className="max-w-sm"
          content={
            <p className="text-center whitespace-nowrap">
              Total import count{" "}
              <span className="text-center text-mineshaft-400">(matching filters)</span>
            </p>
          }
        >
          <div className="flex items-center gap-2">
            <ImportIcon className="size-3.5 text-success" />
            {/*<FontAwesomeIcon icon={faFileImport} className="text-green-700" />*/}
            <span>{importCount}</span>
          </div>
        </Tooltip>
      )}
      {folderCount > 0 && (
        <Tooltip
          className="max-w-sm"
          content={
            <p className="text-center whitespace-nowrap">
              Total folder count{" "}
              <span className="text-center text-mineshaft-400">(matching filters)</span>
            </p>
          }
        >
          <div className="flex items-center gap-2 pl-2">
            <FolderIcon className="size-3.5 text-warning" />
            <span>{folderCount}</span>
          </div>
        </Tooltip>
      )}
      {dynamicSecretCount > 0 && (
        <Tooltip
          className="max-w-sm"
          content={
            <p className="text-center whitespace-nowrap">
              Total dynamic secret count{" "}
              <span className="text-center text-mineshaft-400">(matching filters)</span>
            </p>
          }
        >
          <div className="flex items-center gap-2 pl-2">
            <FontAwesomeIcon icon={faFingerprint} className="text-yellow-700" />
            <span>{dynamicSecretCount}</span>
          </div>
        </Tooltip>
      )}
      {secretRotationCount > 0 && (
        <Tooltip
          className="max-w-sm"
          content={
            <p className="text-center whitespace-nowrap">
              Total secret rotation count{" "}
              <span className="text-center text-mineshaft-400">(matching filters)</span>
            </p>
          }
        >
          <div className="flex items-center gap-2 pl-2">
            <FontAwesomeIcon icon={faRotate} className="text-mineshaft-400" />
            <span>{secretRotationCount}</span>
          </div>
        </Tooltip>
      )}
      {secretCount > 0 && (
        <Tooltip
          className="max-w-sm"
          content={
            <p className="text-center whitespace-nowrap">
              Total secret count{" "}
              <span className="text-center text-mineshaft-400">(matching filters)</span>
            </p>
          }
        >
          <div className="flex items-center gap-2 pl-2">
            <KeyIcon className="size-3.5 text-accent" />
            <span>{secretCount}</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
};
