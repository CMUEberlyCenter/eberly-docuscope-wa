import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Logo } from "../../../components/Logo/Logo";

const Page: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="container">
      <header>
        <h1 className="text-center">
          <Logo />
        </h1>
      </header>
      <main>
        <div className="m-3 d-flex justify-content-around flex-row align-items-center gap-3">
          <div>
            <a href={`/draft`} className="btn btn-primary">
              {t("deeplinking.option.draft")}
            </a>
          </div>
          <div>
            <a href={`/review`} className="btn btn-primary">
              {t("deeplinking.option.review")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Page;
