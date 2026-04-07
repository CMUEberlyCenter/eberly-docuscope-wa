import classNames from "classnames";
import { FC, HTMLProps, ReactNode } from "react";

type ToolContainerProps = HTMLProps<HTMLDivElement> & {
  /** The content to display inside the tool container. */
  children: ReactNode;
};
/** Basic container component for tools.  Unifies look between different applications. */
export const ToolContainer: FC<ToolContainerProps> = ({
  children,
  className,
  ...props
}) => (
  <article
    {...props}
    className={classNames(
      className,
      "container-fluid d-flex flex-column flex-grow-1 overflow-auto"
    )}
  >
    {children}
  </article>
);
