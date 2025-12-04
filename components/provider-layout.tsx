"use client";

import React from "react";

interface ProviderLayoutContextType {
  onViewPatients?: () => void;
  setOnViewPatients?: (callback: () => void) => void;
}

const ProviderLayoutContext = React.createContext<ProviderLayoutContextType>({});

export const useProviderLayout = () => React.useContext(ProviderLayoutContext);

export const ProviderLayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [onViewPatients, setOnViewPatientsState] = React.useState<(() => void) | undefined>();

  const setOnViewPatients = React.useCallback((callback: () => void) => {
    setOnViewPatientsState(() => callback);
  }, []);

  return (
    <ProviderLayoutContext.Provider value={{ onViewPatients, setOnViewPatients }}>
      {children}
    </ProviderLayoutContext.Provider>
  );
};

