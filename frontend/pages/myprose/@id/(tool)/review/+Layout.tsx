import { UserButton } from "#components/auth/user/user-button.tsx";
import { ReviewLayout } from "#layouts/ReviewLayout";
import { FC, ReactNode } from "react";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => (
  <ReviewLayout user={<UserButton className="rounded" size="icon" />}>
    {children}
  </ReviewLayout>
);
