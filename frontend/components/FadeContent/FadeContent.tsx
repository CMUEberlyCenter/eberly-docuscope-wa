import DOMPurify from "dompurify";
import { type FC, type HTMLProps, useId, useState } from "react";
import AnimateHeight, { type Height } from "react-animate-height";
import { Button } from "react-bootstrap";
import css from "./FadeContent.module.scss";

type ToolFadeContentProps = {
  minHeight?: Height;
  maxHeight?: Height;
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
        {htmlContent && (
          <div
            // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(htmlContent),
            }}
          />
        )}
        {children}
      </AnimateHeight>
      <div className="d-flex justify-content-around">
        <Button
          variant="icon"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={id}
        >
          ...
        </Button>
      </div>
    </article>
  );
};
