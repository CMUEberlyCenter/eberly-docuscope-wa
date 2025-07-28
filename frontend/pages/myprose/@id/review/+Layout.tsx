import type { FC, ReactNode } from "react";
import { FileUploadProvider } from "../../../../src/app/components/FileUpload/FileUploadContext";

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return <FileUploadProvider>{children}</FileUploadProvider>;
};
export default Layout;
