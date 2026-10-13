import { Legal } from "#components/Legal/Legal";
import { StageHeader } from "#components/StageHeader/StageHeader";
import classNames from "classnames";
import { FC, HTMLProps, ReactNode } from "react";

export const ToolLayout: FC<
  { stage: string; children: ReactNode; user?: ReactNode } & HTMLProps<HTMLDivElement>
> = ({ stage, children, user, className, ...props }) => (
  <aside
    {...props}
    className={classNames(
      className,
      `my-1 border rounded bg-light d-flex flex-column`
    )}
  >
    <StageHeader title={stage} user={user} />
    {children}
    <Legal />
  </aside>
);
