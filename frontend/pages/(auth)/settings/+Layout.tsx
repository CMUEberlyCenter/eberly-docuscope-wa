import { Layout as MyProseLayout } from "#layouts/MyProseLayout.tsx";
import { Translation } from "react-i18next";
import { navigate } from "vike/client/router";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (<MyProseLayout>
    <div className="tw:flex tw:flex-row tw:items-center tw:justify-center tw:gap-4 tw:mb-8">
      <a href="#"onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          navigate("/myprose");
        }
      }}>
        <Translation ns="translation">
          {(t) => t("auth.return")}
        </Translation>
      </a>
    </div>
    {children}
  </MyProseLayout>);
};
