import type { FC, ReactNode } from "react";
import { FileUploadProvider } from "../../src/app/components/FileUpload/FileUploadContext";
// import { PickerProvider } from "../../src/app/components/FileUpload/PickerContex";
// import "@googleworkspace/drive-picker-element"

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  // const clientId = import.meta.env.PUBLIC_ENV__GOOGLE_CLIENT_ID;
  // const developerKey = import.meta.env.GOOGLE_API_KEY;
  // const appId = import.meta.env.PUBLIC_ENV__GOOGLE_APP_KEY;

  // return <FileUploadProvider><drive-picker client-id={clientId} app-id={appId}></drive-picker>{children}</FileUploadProvider>;
  return <FileUploadProvider>{children}</FileUploadProvider>;
};
export default Layout;
