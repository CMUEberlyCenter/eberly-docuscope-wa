import { SafeHTML } from "#components/SafeHTML/SafeHTML";
import { type FC, type HTMLProps, useId, useState } from "react";
import AnimateHeight, { type Height } from "react-animate-height";
import { Button } from "react-bootstrap";
import css from "./FadeContent.module.scss";

type ToolFadeContentProps = {
  /** The minimum height of the component. */
  minHeight?: Height;
  /** The maximum height of the component. */
  maxHeight?: Height;
  /** The HTML content to display. */
  htmlContent?: string;
} & HTMLProps<HTMLDivElement>;
/** An expandable component that fades overflow content when minimized. */
export const FadeContent: FC<ToolFadeContentProps> = ({
  children,
  minHeight,
  maxHeight,
  htmlContent,
  ...props
}) => {
  minHeight = minHeight ?? 80;
  maxHeight = maxHeight ?? "auto";
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  return (
    <article {...props}>
      <AnimateHeight
        id={id}
        height={expanded ? maxHeight : minHeight}
        className={css["fade-content"]}
        data-fade={!expanded}
      >
        {/* Workaround for html string content. */}
        {htmlContent && <SafeHTML html={htmlContent} />}
        {children}
      </AnimateHeight>
      <div className="tw:flex tw:justify-around">
        <Button
          variant="icon"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={id}
        >
          &hellip;
        </Button>
      </div>
    </article>
  );
};
