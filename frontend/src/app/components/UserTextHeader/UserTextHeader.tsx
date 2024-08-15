import { FC } from "react";
import { Card, Stack } from "react-bootstrap";
import { Translation } from "react-i18next";

type UserTextHeaderProps = JSX.IntrinsicAttributes & { title: string | undefined };
export const UserTextHeader: FC<UserTextHeaderProps> = ({ title }) => (
  <Card.Header className="d-flex justify-content-between align-items-center">
    <Translation>
      {(t) => (
        <Stack>
          <Card.Subtitle className="text-muted">
            {t("editor.menu.task")}
          </Card.Subtitle>
          <Card.Title>
            {title ?? t("editor.menu.no_task")}
          </Card.Title>
        </Stack>
      )}
    </Translation>
  </Card.Header>
);
