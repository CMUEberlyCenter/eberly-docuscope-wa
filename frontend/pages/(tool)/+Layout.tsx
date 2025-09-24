import { type FC, type ReactNode } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { FileUploadProvider } from "../../src/app/components/FileUpload/FileUploadContext";
import { PickerProvider } from "../../src/app/components/FileUpload/PickerContext";
import { FileImportErrorProvider } from "../../src/app/components/FileUpload/FileImportErrors";
import { FileTextProvider } from "../../src/app/components/FileUpload/FileTextContext";

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const pageContext = usePageContext();
  return (
    <FileImportErrorProvider>
      <FileTextProvider>
        <FileUploadProvider>
          <PickerProvider clientId={pageContext.google?.clientId} apiKey={pageContext.google?.apiKey} appId={pageContext.google?.appKey}>
            {children}
          </PickerProvider>
        </FileUploadProvider>
      </FileTextProvider>
    </FileImportErrorProvider>
  );
};
export default Layout;
