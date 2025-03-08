import React, { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { UserWsTags } from "@app/hooks/api/tags/types";

interface AccessTreeContextProps {
  secretName: string;
  setSecretName: (secretName: string) => void;
  secretTags: UserWsTags;
  setSecretTags: (secretTags: UserWsTags) => void;
}

const AccessTreeContext = createContext<AccessTreeContextProps | undefined>(undefined);

interface AccessTreeProviderProps {
  children: ReactNode;
}

export const AccessTreeProvider: React.FC<AccessTreeProviderProps> = ({ children }) => {
  const [secretName, setSecretName] = useState<string>("*");
  const [secretTags, setSecretTags] = useState<UserWsTags>([]);

  const value = useMemo(
    () => ({
      secretName,
      setSecretName,
      secretTags,
      setSecretTags
    }),
    [secretName, secretTags]
  );

  return <AccessTreeContext.Provider value={value}>{children}</AccessTreeContext.Provider>;
};

export const useAccessTreeContext = (): AccessTreeContextProps => {
  const context = useContext(AccessTreeContext);

  if (!context) {
    throw new Error("useAccessTreeContext must be used within a AccessTreeProvider");
  }

  return context;
};
