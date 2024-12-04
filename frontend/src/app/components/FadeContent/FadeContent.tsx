import { FC, HTMLProps, useEffect, useState } from "react";
import AnimateHeight, { Height } from "react-animate-height";
import { Button } from "react-bootstrap";
import css from "./FadeContent.module.scss";

type ToolFadeContentProps = {
  minHeight?: Height;
  maxHeight?: Height;
  htmlContent?: string;
} & HTMLProps<HTMLDivElement>;
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
  const [height, setHeight] = useState<Height>(minHeight);
  useEffect(() => {
    setHeight(expanded ? maxHeight : minHeight);
  }, [expanded]);

  return (
    <article {...props}>
      <AnimateHeight
        height={height}
        aria-expanded={expanded}
        className={css["fade-content"]}
      >
        {/* Workaround for html string content. */}
        {htmlContent && (
          <div
            dangerouslySetInnerHTML={{
              __html: htmlContent,
            }}
          />
        )}
        {children}
      </AnimateHeight>
      <div className="d-flex justify-content-around">
        <Button variant="icon" onClick={() => setExpanded(!expanded)}>
          ...
        </Button>
      </div>
    </article>
  );
};
