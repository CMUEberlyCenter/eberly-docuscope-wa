import { FC } from "react";
import { Card, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "./+data";

export const Page: FC = () => {
  const { settings } = usePageContext();
  const { ANTHROPIC_MODEL, DEFAULT_LANGUAGE, ACCESS_LEVEL } = useData<Data>();
  const { t } = useTranslation();
  useTranslation("review"); // load review namespace for translation availability
  return (
    <Card>
      <Card.Header>{t("admin.settings.title")}</Card.Header>
      <Card.Body>
        <ListGroup className="mb-3">
          <ListGroup.Item>
            {t("admin.settings.text_to_speech")}
            <strong>
              {settings?.text2speech
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.scribe")}
            <strong>
              {settings?.scribe
                ? t("admin.settings.available")
                : t("admin.settings.unavailable")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.model")}
            <strong>{ANTHROPIC_MODEL}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.word_count_limit")}
            <strong>
              {settings?.word_count_limit.toLocaleString() ??
                t("admin.settings.unlimited")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.notes_to_prose")}
            <strong>
              {settings?.scribe && settings?.notes2prose
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.notes_to_bullets")}
            <strong>
              {settings?.scribe && settings?.notes2bullets
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.civil_tone")}
            <strong>
              {settings?.scribe && settings?.civil_tone
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.credibility")}
            <strong>
              {settings?.scribe && settings?.credibility
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.expectations")}
            <strong>
              {settings?.scribe && settings?.expectations
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.lines_of_arguments")}
            <strong>
              {settings?.scribe && settings?.lines_of_arguments
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.logical_flow")}
            <strong>
              {settings?.scribe && settings?.logical_flow
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.paragraph_clarity")}
            <strong>
              {settings?.scribe && settings?.paragraph_clarity
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.professional_tone")}
            <strong>
              {settings?.scribe && settings?.professional_tone
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.prominent_topics")}
            <strong>
              {settings?.scribe && settings?.prominent_topics
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.sentences")}
            <strong>
              {settings?.sentence_density
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.sources")}
            <strong>
              {settings?.scribe && settings?.sources
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.organization")}
            <strong>
              {settings?.term_matrix
                ? t("admin.settings.enabled")
                : t("admin.settings.disabled")}
            </strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.language")} <strong>{DEFAULT_LANGUAGE}</strong>
          </ListGroup.Item>
          <ListGroup.Item>
            {t("admin.settings.access_level")} <strong>{ACCESS_LEVEL}</strong>
          </ListGroup.Item>
        </ListGroup>
        {/* <h3>Raw Settings Data</h3>
        <pre>{JSON.stringify(settings, null, 2)}</pre> */}
      </Card.Body>
    </Card>
  );
};
