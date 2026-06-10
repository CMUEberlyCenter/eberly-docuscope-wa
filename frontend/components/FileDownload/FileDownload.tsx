import { type FC, useEffect, useMemo, useRef } from "react";

/**
 * A simple hidden component that prompts a file download event.
 * @param content the Blob content of the file to download.
 * @returns
 */
export const FileDownload: FC<{ content: Blob; title?: string }> = ({
  content,
  title,
}) => {
  const url = useMemo(() => URL.createObjectURL(content), [content]);
  const ref = useRef<HTMLAnchorElement>(null); // a href reference.
  // Create and destroy Object URL to use in link.
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);
  // Invoke click to start download when there is a link.
  useEffect(() => {
    ref.current?.click();
  }, [ref]);

  return <a className="d-none" ref={ref} href={url} download={title ?? true} />;
};
