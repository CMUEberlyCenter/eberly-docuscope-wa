import DOMPurify from "dompurify";
import { FC, HTMLProps } from "react";

type SafeHTMLProps = {
  html: string;
} & HTMLProps<HTMLDivElement>;

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
