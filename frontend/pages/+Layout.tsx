/**
 * @fileoverview Layout component for the application.
 * Mostly responsible for importing global styles and providing a wrapper for
 * the entire app.
 */
import { type FC, type ReactNode } from "react";
import "./index.scss";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="layout">{children}</div>
);
