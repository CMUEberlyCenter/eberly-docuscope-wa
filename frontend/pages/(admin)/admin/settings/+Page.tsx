import { FC } from "react";
import { Card, ListGroup } from "react-bootstrap";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "./+data";
import { useTranslation } from "react-i18next";

export const Page: FC = () => {
  const { settings } = usePageContext();
  const { ANTHROPIC_MODEL, DEFAULT_LANGUAGE, ACCESS_LEVEL } = useData<Data>();
  const { t } = useTranslation();
  const { t: tr } = useTranslation("review");
  return (
    <Card>
      <Card.Header>Settings</Card.Header>
      <Card.Body>
        <h2>Global Settings</h2>
        <ListGroup className="mb-3">
          <ListGroup.Item>
            Text-to-speech:{" "}
            <strong>{settings?.text2speech ? "Enabled" : "No"}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            A.I. tools:{" "}
            <strong>{settings?.scribe ? "Available" : "All Disabled"}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            Anthropic Model: <strong>{ANTHROPIC_MODEL}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            Word Count Limit:{" "}
            <strong>
              {settings?.word_count_limit.toLocaleString() ?? "No limit"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("tool.button.prose.tooltip")} {t("tool.tab.generate")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.notes2prose ? "Enabled" : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("tool.button.bullets.tooltip")} {t("tool.tab.generate")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.notes2bullets ? "Enabled" : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:civil_tone.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.civil_tone ? "Enabled" : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:credibility.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.credibility ? "Enabled" : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:expectations.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.expectations ? "Enabled" : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:lines_of_arguments.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.lines_of_arguments
                ? "Enabled"
                : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:logical_flow.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.logical_flow ? "Enabled" : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:paragraph_clarity.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.paragraph_clarity
                ? "Enabled"
                : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:professional_tone.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.professional_tone
                ? "Enabled"
                : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:prominent_topics.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.prominent_topics
                ? "Enabled"
                : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:sentences.title")} {tr("review:title")} Tool:{" "}
            <strong>{settings?.sentence_density ? "Enabled" : "No"}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:sources.title")} {tr("review:title")} Tool:{" "}
            <strong>
              {settings?.scribe && settings?.sources ? "Enabled" : "No"}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {tr("review:organization.title")} {tr("review:title")} Tool:{" "}
            <strong>{settings?.term_matrix ? "Enabled" : "No"}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            Default Language: <strong>{DEFAULT_LANGUAGE}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            WTD access level: <strong>{ACCESS_LEVEL}</strong>
          </ListGroup.Item>
        </ListGroup>
        {/* <h3>Raw Settings Data</h3>
        <pre>{JSON.stringify(settings, null, 2)}</pre> */}
      </Card.Body>
    </Card>
  );
};
