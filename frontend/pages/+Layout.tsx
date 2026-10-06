/**
 * @fileoverview Layout component for the application.
 * Mostly responsible for importing global styles and providing a wrapper for
 * the entire app.
 */
import "bootstrap";
import { type FC, type ReactNode } from "react";
import "./index.scss";
import "./tailwind.css";
// import { AuthProvider } from "@better-auth-ui/react";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="layout" id="page-content">
    {/* <AuthProvider> */}
    {children}
    {/* </AuthProvider> */}
  </div>
);
