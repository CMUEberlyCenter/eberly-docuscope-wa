import { FC, ReactNode, use } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/app/i18n";
import "../src/app/index.scss";

const translate = i18n.loadNamespaces("translation");

const I18Next: FC<{ children: ReactNode }> = ({ children }) => {
  use(translate);
  return (
    <I18nextProvider i18n={i18n} defaultNS={"translation"}>
      {children}
    </I18nextProvider>
  );
};

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="layout">
      <I18Next>{children}</I18Next>
    </div>
  );
};
export default Layout;
