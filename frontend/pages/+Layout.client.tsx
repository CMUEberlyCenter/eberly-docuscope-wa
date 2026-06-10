import { I18Next } from "#layouts/I18Next";
import { FC, ReactNode } from "react";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <I18Next>{children}</I18Next>
);
