import { type FC, type ReactNode, StrictMode, use } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/app/i18n";
import "../src/app/index.scss";

const translate = i18n.loadNamespaces("translation");

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  use(translate);
  return (
    <StrictMode>
      <div className="layout">
        <I18nextProvider i18n={i18n} defaultNS={"translation"}>
          {children}
        </I18nextProvider>
      </div>
    </StrictMode>
  );
};
export default Layout;
