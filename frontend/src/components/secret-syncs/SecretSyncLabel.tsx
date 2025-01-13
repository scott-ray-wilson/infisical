import { ReactNode } from "react";

type Props = {
  label: string;
  children?: ReactNode;
};

export const SecretSyncLabel = ({ label, children }: Props) => {
  return (
    <div>
      <p className="text-xs font-medium text-mineshaft-400">{label}</p>
      {children ? (
        <p className="text-sm text-mineshaft-100">{children}</p>
      ) : (
        <p className="text-sm italic text-mineshaft-400/50">None</p>
      )}
    </div>
  );
};
