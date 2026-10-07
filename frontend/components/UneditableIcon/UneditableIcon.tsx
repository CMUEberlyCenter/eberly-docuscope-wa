import NoEditIcon from "#assets/icons/no_edit_icon.svg?react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#components/ui/tooltip.tsx";
import { FC } from "react";
import { useTranslation } from "react-i18next";

/** Icon indicating that the content is not editable. */
export const UneditableIcon: FC = () => {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <NoEditIcon
            role="status"
            aria-label={t("editor.menu.no_edit")}
            title={t("editor.menu.no_edit")}
          />
        }
      />
      <TooltipContent side="bottom">{t("editor.menu.no_edit")}</TooltipContent>
    </Tooltip>
  );
};
