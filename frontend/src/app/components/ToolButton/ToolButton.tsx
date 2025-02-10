import classNames from "classnames";
import { FC, ReactNode } from "react";
import { Button, ButtonGroup, ButtonProps, OverlayTrigger, Stack, Tooltip } from "react-bootstrap";
import style from "./ToolButton.module.scss";

type ToolButtonProps = ButtonProps & {
  tooltip: string;
  icon: ReactNode | null;
  title: string;
};
/** Button component with a tooltip and an icon. */
export const ToolButton: FC<ToolButtonProps> = ({
  tooltip,
  icon,
  title,
  className,
  ...props
}) => (
  <ButtonGroup className="bg-white shadow-sm rounded-2">
    <OverlayTrigger placement="bottom" overlay={<Tooltip>{tooltip}</Tooltip>}>
      <Button variant="outline-primary" {...props} className={classNames(className, style.tool_button, "rounded-2")}>
        <Stack>
          {icon}
          <span>{title}</span>
        </Stack>
      </Button>
    </OverlayTrigger>
  </ButtonGroup>
);
