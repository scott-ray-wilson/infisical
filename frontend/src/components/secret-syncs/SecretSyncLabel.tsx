import { ReactNode } from "react";

type Props = {
  label: string;
  children?: ReactNode;
  className?: string;
};

export const SecretSyncLabel = ({ label, children, className }: Props) => {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-mineshaft-400">{label}</p>
      {children ? (
        <p className="text-sm text-mineshaft-100">{children}</p>
      ) : (
        <p className="text-sm italic text-mineshaft-400/50">None</p>
      )}
    </div>
  );
};
