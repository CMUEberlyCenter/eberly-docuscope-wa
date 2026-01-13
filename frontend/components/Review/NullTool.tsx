import classNames from "classnames";
import { FC, HTMLProps } from "react";
import Stack from "react-bootstrap/esm/Stack";
import ReviewIcon from "../../assets/icons/review_icon.svg?react";

/** No selected tool component. */
export const NullTool: FC<HTMLProps<HTMLDivElement> & { text: string }> = ({
  className,
  text,
  ...props
}) => (
  <article
    {...props}
    className={classNames(
      className,
      "container-fluid flex-grow-1 overflow-auto d-flex flex-column position-relative"
    )}
  >
    <Stack className="position-absolute top-50 start-50 translate-middle w-75">
      <ReviewIcon className="mx-auto text-primary md-icon" />
      <span className="mx-auto text-center">{text}</span>
    </Stack>
  </article>
);
