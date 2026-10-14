import { useTranslation } from "react-i18next";
import logo from "#assets/logo.svg";

export const Page = () => {
  const { t } = useTranslation();
  return (
    <div className="tw:flex tw:flex-col tw:items-center tw:justify-center tw:min-h-screen tw:py-2">
      <div className="tw:mb-8 tw:text-xl">
        <img
          className="tw:w-48 tw:h-auto"
          src={logo}
          alt={t("document.title")}
        />
      </div>
      <h1 className="text-4xl font-bold">{t("index.welcome")}</h1>
      <p className="mt-4 text-lg text-gray-600">{t("document.description")}</p>
      <a
        href="https://www.cmu.edu/corecompetencies/communication/resources-and-tools/myprose/index.html"
        className="mt-6"
      >
        Learn more about MyProse
      </a>
    </div>
  );
};
