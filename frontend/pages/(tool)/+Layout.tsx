import { ImportProvider } from "#components/FileUpload/ImportProvider";
import { type FC, type ReactNode } from "react";
import { usePageContext } from "vike-react/usePageContext";

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const pageContext = usePageContext();
  return (
    <ImportProvider
      clientId={pageContext.google?.clientId}
      apiKey={pageContext.google?.apiKey}
      appId={pageContext.google?.appKey}
    >
      {children}
    </ImportProvider>
  );
};
export default Layout;
