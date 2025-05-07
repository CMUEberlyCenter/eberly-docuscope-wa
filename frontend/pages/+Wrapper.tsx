import { FC, ReactNode } from "react";

export const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
