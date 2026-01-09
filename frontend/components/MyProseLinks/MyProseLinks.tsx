import { FC } from "react";
import { ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { DbWritingTask } from "../../src/lib/WritingTask";
import { ClipboardIconButton } from "../ClipboardIconButton/ClipboardIconButton";

const MyLink: FC<{ href: URL; title: string }> = ({ href, title }) => {
  const url = href.toString();
  return (
    <div className="d-flex flex-column justify-content-between">
      <a href={url}>{title}</a>
      <span>
        {url}
        <ClipboardIconButton
          onClick={() => navigator.clipboard.writeText(url)}
        />
      </span>
    </div>
  );
};

export const MyProseLinks: FC<{
  selected: DbWritingTask | null;
  hostname: URL;
}> = ({ selected, hostname }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-1 py-1">
      <header>
        <h4 className="d-inline">{t("genlink.link")}</h4>
      </header>
      <ListGroup>
        {selected ? (
          <>
            <ListGroup.Item>
              <MyLink
                href={
                  new URL(
                    `/myprose/${selected.public && selected.info.id ? selected.info.id : selected._id}`,
                    hostname
                  )
                }
                title={t("genlink.top_template", {
                  title: selected.info.name,
                })}
              />
            </ListGroup.Item>
            <ListGroup.Item>
              <MyLink
                href={
                  new URL(
                    `/myprose/${selected.public && selected.info.id ? selected.info.id : selected._id}/draft`,
                    hostname
                  )
                }
                title={t("genlink.draft_template", {
                  title: selected.info.name,
                })}
              />
            </ListGroup.Item>
            <ListGroup.Item>
              <MyLink
                href={
                  new URL(
                    `/myprose/${selected.public && selected.info.id ? selected.info.id : selected._id}/review`,
                    hostname
                  )
                }
                title={t("genlink.review_template", {
                  title: selected.info.name,
                })}
              />
            </ListGroup.Item>
          </>
        ) : (
          <>
            <ListGroup.Item>
              <MyLink
                href={new URL("/myprose", hostname)}
                title={t("document.title")}
              />
            </ListGroup.Item>
            <ListGroup.Item>
              <MyLink
                href={new URL("/draft", hostname)}
                title={t("genlink.draft")}
              />
            </ListGroup.Item>
            <ListGroup.Item>
              <MyLink
                href={new URL("/review", hostname)}
                title={t("genlink.review")}
              />
            </ListGroup.Item>
          </>
        )}
      </ListGroup>
    </div>
  );
};
