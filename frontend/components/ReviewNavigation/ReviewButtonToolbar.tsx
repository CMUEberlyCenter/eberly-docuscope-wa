import { FC, ReactNode } from "react";

/** @component A toolbar for review tool buttons. */
export const ReviewButtonToolbar: FC<{ children: ReactNode }> = ({
  children,
}) => (
  <div
    className="tw:m-4 tw:flex tw:justify-center tw:gap-6 tw:flex-wrap"
    role="toolbar"
  >
    {children}
  </div>
);
