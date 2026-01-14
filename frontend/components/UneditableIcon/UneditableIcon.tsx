import { FC } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import NoEditIcon from "../../assets/icons/no_edit_icon.svg?react";

/** Icon indicating that the content is not editable. */
export const UneditableIcon: FC = () => {
  const { t } = useTranslation();
  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip>{t("editor.menu.no_edit")}</Tooltip>}
    >
      <NoEditIcon
        role="status"
        aria-label={t("editor.menu.no_edit")}
        title={t("editor.menu.no_edit")}
      />
    </OverlayTrigger>
  );
};
