import DOMPurify from "dompurify";
import { FC, HTMLProps } from "react";

type SafeHTMLProps = {
  /** The HTML string to be rendered. */
  html: string;
} & HTMLProps<HTMLDivElement>;

/**
 * Component to render HTML in a div after it has been sanitized.
 *
 * @component
 * @example
 * ```tsx
 * <SafeHTML html="<p>Hello, world!</p>" />
 * ```
 *
 * @param props.html - The HTML string to be rendered.
 * @param props... - Additional props to be set on the div element.
 */
export const SafeHTML: FC<SafeHTMLProps> = ({ html, ...props }) => {
  const sanitizedHTML = DOMPurify.sanitize(html, { RETURN_TRUSTED_TYPE: true });
  return (
    <div
      {...props}
      // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
};
