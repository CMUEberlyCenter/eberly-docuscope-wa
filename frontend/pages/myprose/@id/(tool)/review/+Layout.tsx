import { FC, ReactNode } from "react";
import { ReviewLayout } from "../../../../../layouts/ReviewLayout";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <ReviewLayout>{children}</ReviewLayout>
);
