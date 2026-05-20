import { Legal } from "#components/Legal/Legal.js";
import { StageHeader } from "#components/StageHeader/StageHeader.js";
import classNames from "classnames";
import { FC, HTMLProps, ReactNode } from "react";

export const ToolLayout: FC<
  HTMLProps<HTMLDivElement> & { stage: string; children: ReactNode }
> = ({ stage, children, className, ...props }) => (
  <aside
    {...props}
    className={classNames(
      className,
      `my-1 border rounded bg-light d-flex flex-column`
    )}
  >
    <StageHeader title={stage} />
    {children}
    <Legal />
  </aside>
);
