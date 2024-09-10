import { ReactNode, FC, useState, useEffect } from "react";
import AnimateHeight, { Height } from "react-animate-height";
import { Button } from "react-bootstrap";
import css from "./FadeContent.module.scss";

type ToolFadeContentProps = {
  children: ReactNode;
  minHeight?: Height;
  maxHeight?: Height;
};
export const FadeContent: FC<ToolFadeContentProps> = ({
  children,
  minHeight,
  maxHeight,
}) => {
  minHeight = minHeight ?? 80;
  maxHeight = maxHeight ?? "auto";
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState<Height>(minHeight);
  useEffect(() => {
    setHeight(expanded ? maxHeight : minHeight);
  }, [expanded]);

  return (
    <article>
      <AnimateHeight
        height={height}
        aria-expanded={expanded}
        className={css["fade-content"]}
      >
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
