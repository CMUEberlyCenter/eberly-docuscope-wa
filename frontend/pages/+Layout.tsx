import { type FC, type ReactNode } from "react";
import "./index.scss";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="layout">{children}</div>
);
