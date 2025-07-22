import { createContext, useContext } from "react";
import type { Settings } from "../../../lib/ToolSettings";

export const SettingsContext = createContext<Settings | null>(null);
export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error(
      "useSettingsContext must be used within a SettingsProvider"
    );
  }
  return context;
};
