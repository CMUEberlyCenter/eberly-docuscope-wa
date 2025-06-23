import { type FC, type ReactNode } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { SettingsContext } from "../src/app/components/Settings/SettingsContext";
import { DEFAULT } from "../src/lib/ToolSettings";

export const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const ctx = usePageContext();
  return (
    <SettingsContext.Provider value={ctx.settings ?? DEFAULT}>
      {children}
    </SettingsContext.Provider>
  );
};
