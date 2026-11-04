import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#components/ui/card.tsx";
import { FC } from "react";
import { useTranslation } from "react-i18next";

/** Index page for the admin dashboard. */
export const Page: FC = () => {
  const { t } = useTranslation("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="tw:text-lg">{t("home")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="tw:text-base">{t("welcome")}</p>
      </CardContent>
    </Card>
  );
};
