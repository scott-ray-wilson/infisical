import ms from "ms";

import { IdentityAuthFieldDisplay } from "./IdentityAuthFieldDisplay";

type Props = {
  data: {
    lockoutThreshold: number;
    lockoutDurationSeconds: number;
    lockoutCounterResetSeconds: number;
  };
};

export const IdentityAuthLockoutFields = ({ data }: Props) => {
  return (
    <>
      <div className="col-span-2 mt-3 border-b border-mineshaft-500 pb-2">
        <span className="text-bunker-300">Lockout Options</span>
      </div>
      <IdentityAuthFieldDisplay label="Lockout Threshold">
        {data.lockoutThreshold}
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Lockout Duration">
        {ms(data.lockoutDurationSeconds * 1000, { long: true })}
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Lockout Counter Reset">
        {ms(data.lockoutCounterResetSeconds * 1000, { long: true })}
      </IdentityAuthFieldDisplay>
    </>
  );
};
