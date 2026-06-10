import { ReviewLayout } from "#layouts/ReviewLayout";
import { FC, ReactNode } from "react";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <ReviewLayout>{children}</ReviewLayout>
);
