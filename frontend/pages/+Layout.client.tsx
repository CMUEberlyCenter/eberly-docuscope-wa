import { FC, ReactNode } from "react";
import { I18Next } from "../layouts/I18Next";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <I18Next>{children}</I18Next>
);
