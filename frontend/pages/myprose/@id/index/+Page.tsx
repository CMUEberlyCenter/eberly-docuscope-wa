import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { usePageContext } from "vike-react/usePageContext";
import { Logo } from "../../../../components/Logo/Logo";
import { useWritingTask } from "../../../../components/WritingTaskContext/WritingTaskContext";

export const Page: FC = () => {
  const { urlOriginal } = usePageContext();
  const { task } = useWritingTask();
  const { t } = useTranslation();

  return (
    <div className="container">
      <header>
        <h1 className="text-center">
          <Logo />
        </h1>
      </header>
      <main>
        <h3>{task?.info.name ?? t("document.title")}</h3>
        <p>{task?.rules.overview}</p>
        <div className="m-3 d-flex justify-content-around flex-row align-items-center gap-3">
          <div>
            <a href={`${urlOriginal}/draft`} className="btn btn-primary">
              {t("deeplinking.option.draft")}
            </a>
          </div>
          <div>
            <a href={`${urlOriginal}/review`} className="btn btn-primary">
              {t("deeplinking.option.review")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};
