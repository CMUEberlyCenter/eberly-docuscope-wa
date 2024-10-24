import { FC, useEffect, useRef, useState } from "react";

export const FileDownload: FC<{ content: Blob }> = ({ content }) => {
  const [url, setUrl] = useState<string>("");
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    setUrl(URL.createObjectURL(content));
    return () => {
      URL.revokeObjectURL(url);
      setUrl("");
    };
  }, [content]);
  useEffect(() => {
    if (url && ref.current) {
      ref.current?.click();
    }
  }, [url, ref]);

  return <a className="d-none" ref={ref} href={url} download="myprose.docx" />;
};
