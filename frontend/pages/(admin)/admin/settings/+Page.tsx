import { FC } from "react";
import { Card, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "./+data";

export const Page: FC = () => {
  const { settings } = usePageContext();
  const { ANTHROPIC_MODEL, DEFAULT_LANGUAGE, ACCESS_LEVEL } = useData<Data>();
  const { t } = useTranslation("admin");
  useTranslation("review"); // load review namespace for translation availability
  return (
    <Card>
      <Card.Header>{t("settings.title")}</Card.Header>
      <Card.Body>
        <ListGroup className="mb-3">
          <ListGroup.Item>
            {t("settings.text_to_speech")}
            <strong>
              {settings?.text2speech
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.scribe")}
            <strong>
              {settings?.scribe
                ? t("settings.available")
                : t("settings.unavailable")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.model")}
            <strong>{ANTHROPIC_MODEL}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.word_count_limit")}
            <strong>
              {settings?.word_count_limit.toLocaleString() ??
                t("settings.unlimited")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.notes_to_prose")}
            <strong>
              {settings?.scribe && settings?.notes2prose
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.notes_to_bullets")}
            <strong>
              {settings?.scribe && settings?.notes2bullets
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.civil_tone")}
            <strong>
              {settings?.scribe && settings?.civil_tone
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.credibility")}
            <strong>
              {settings?.scribe && settings?.credibility
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.expectations")}
            <strong>
              {settings?.scribe && settings?.expectations
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.lines_of_arguments")}
            <strong>
              {settings?.scribe && settings?.lines_of_arguments
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.logical_flow")}
            <strong>
              {settings?.scribe && settings?.logical_flow
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.paragraph_clarity")}
            <strong>
              {settings?.scribe && settings?.paragraph_clarity
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.professional_tone")}
            <strong>
              {settings?.scribe && settings?.professional_tone
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.prominent_topics")}
            <strong>
              {settings?.scribe && settings?.prominent_topics
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.sentences")}
            <strong>
              {settings?.sentence_density
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.sources")}
            <strong>
              {settings?.scribe && settings?.sources
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.organization")}
            <strong>
              {settings?.term_matrix
                ? t("settings.enabled")
                : t("settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.language")} <strong>{DEFAULT_LANGUAGE}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("settings.access_level")} <strong>{ACCESS_LEVEL}</strong>
          </ListGroup.Item>
        </ListGroup>
        {/* <h3>Raw Settings Data</h3>
        <pre>{JSON.stringify(settings, null, 2)}</pre> */}
      </Card.Body>
    </Card>
  );
};
