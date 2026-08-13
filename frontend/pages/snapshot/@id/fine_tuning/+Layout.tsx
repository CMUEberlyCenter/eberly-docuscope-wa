import { ParagraphClarityButton } from "#components/Review/ParagraphClarity";
import { ProfessionalToneButton } from "#components/Review/ProfessionalTone";
import { SentencesButton } from "#components/Review/Sentences";
import { SourcesButton } from "#components/Review/Sources";
import { isEnabled } from "#lib/WritingTask";
import { FC, ReactNode } from "react";
import { Alert, ButtonToolbar } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { Data } from "../+data";
import { useSnapshotContext } from "../SnapshotContext";

type Tool =
  "paragraph_clarity" | "sentence_density" | "professional_tone" | "sources";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { routeParams, urlPathname, settings } = usePageContext();
  const [, setSnapshotContext] = useSnapshotContext();
  const { task, tool_config } = useData<Data>();
  const { t } = useTranslation("review");
  const id = routeParams.id as string;
  const match = urlPathname.match(/\/snapshot\/[^/]+\/fine_tuning\/([^/]+)/);
  const activeTool = match?.at(1) as string;
  const onSelect = (key: string) => {
    if (key === activeTool) {
      setSnapshotContext({ fine_tuning: null });
      navigate(`/snapshot/${id}/fine_tuning`);
    } else {
      setSnapshotContext({ fine_tuning: key });
      navigate(`/snapshot/${id}/fine_tuning/${key}`);
    }
  };
  const disabled = (tool: Tool): boolean => {
    return !tool_config.includes(tool);
  };

  return (
    <div className="h-100 d-flex flex-column overflow-auto">
      <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
        {settings?.paragraph_clarity && isEnabled(task, "paragraph_clarity") ? (
          <ParagraphClarityButton
            disabled={disabled("paragraph_clarity")}
            active={activeTool === "paragraph_clarity"}
            onClick={() => onSelect("paragraph_clarity")}
          />
        ) : null}
        {settings?.sentence_density && isEnabled(task, "sentence_density") ? (
          <SentencesButton
            disabled={disabled("sentence_density")}
            active={activeTool === "sentence_density"}
            onClick={() => onSelect("sentence_density")}
          />
        ) : null}
        {settings?.professional_tone && isEnabled(task, "professional_tone") ? (
          <ProfessionalToneButton
            disabled={disabled("professional_tone")}
            active={activeTool === "professional_tone"}
            onClick={() => onSelect("professional_tone")}
          />
        ) : null}
        {settings?.sources && isEnabled(task, "sources") ? (
          <SourcesButton
            disabled={disabled("sources")}
            active={activeTool === "sources"}
            onClick={() => onSelect("sources")}
          />
        ) : null}
      </ButtonToolbar>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert>
            <Alert.Heading>{t("error.header")}</Alert.Heading>
            {t("error.content")}
            {t("error.details", {
              details: {
                message: error instanceof Error ? error.message : String(error),
              },
            })}
          </Alert>
        )}
      >
        {children}
      </ErrorBoundary>
    </div>
  );
};
