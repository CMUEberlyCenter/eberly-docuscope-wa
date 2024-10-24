import { FC, useEffect, useRef, useState } from "react";

/**
 * A simple hidden component that prompts a file download event.
 * @param content the Blob content of the file to download.
 * @returns 
 */
export const FileDownload: FC<{ content: Blob }> = ({ content }) => {
  const [url, setUrl] = useState<string>(""); // content as ObjectURL.
  const ref = useRef<HTMLAnchorElement>(null); // ahref reference.
  // Create and destroy Object URL to use in link.
  useEffect(() => {
    setUrl(URL.createObjectURL(content));
    return () => {
      URL.revokeObjectURL(url);
      setUrl("");
    };
  }, [content]);
  // Invoke click to start download when there is an ahref and url encoded data.
  useEffect(() => {
    if (url && ref.current) {
      ref.current?.click();
    }
  }, [url, ref]);

  return <a className="d-none" ref={ref} href={url} download="myprose.docx" />;
};
