import { FC } from "react";
import { Nav, NavProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";

export type ToolCategory = "big_picture" | "fine_tuning";

export const ReviewToolCategoryNav: FC<NavProps> = ({
  onSelect,
  activeKey,
  variant,
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  return (
    <Nav
      variant="underline"
      activeKey={activeKey}
      onSelect={onSelect}
      className="justify-content-around inverse-color"
      {...props}
    >
      <Nav.Item>
        <Nav.Link eventKey="big_picture">{t("tabs.big_picture")}</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey="fine_tuning">{t("tabs.fine_tuning")}</Nav.Link>
      </Nav.Item>
    </Nav>
  );
};
