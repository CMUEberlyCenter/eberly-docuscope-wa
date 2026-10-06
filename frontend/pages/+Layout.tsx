/**
 * @fileoverview Layout component for the application.
 * Mostly responsible for importing global styles and providing a wrapper for
 * the entire app.
 */
import { authClient } from "#/utils/auth-client.ts";
import { TooltipProvider } from "#components/ui/tooltip.tsx";
import { AuthProvider } from "@better-auth-ui/react";
import "bootstrap";
import { type FC, type ReactNode } from "react";
import { navigate } from "vike/client/router";
import "./index.scss";
import "./tailwind.css";
import { adminPlugin } from "#/lib/auth/admin-plugin.ts";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="layout" id="page-content">
    <TooltipProvider>
      <AuthProvider
        authClient={authClient}
        navigate={({ to, replace }) => navigate(to, { overwriteLastHistoryEntry: replace })}
        plugins={[adminPlugin()]}
        Link={({ href, children, ...props }) => (
          <a href={href} {...props}
            onClick={(e) => {
              e.preventDefault();
              navigate(href);
            }}
          >
            {children}
          </a>
        )}
      >
        {children}
      </AuthProvider>
    </TooltipProvider>
  </div>
);
