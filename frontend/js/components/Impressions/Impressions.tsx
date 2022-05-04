/*
The Impressions tools is the used to display and interact with the
results of the DocuScope tagger for the given text.

Users can click on the sunburst chart wedges to zoom in and out.
The category tree is expandable and selecting a category with the
checkbox will initiate highlighting in the tagged text view.
*/
import { Subscribe } from "@react-rxjs/core";
import * as React from "react";
import { Alert, Card, ProgressBar, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import {
  useEditorState,
  useEditorText,
} from "../../service/editor-state.service";
import { useTaggerResults } from "../../service/tagger.service";
import CategoryTree from "../CategoryTree/CategoryTree";
import SunburstChart from "../SunburstChart/SunburstChart";
import TabTitle from "../TabTitle/TabTitle";

const ErrorFallback = (props: { error?: Error }) => (
  <div role="alert" className="alert alert-danger">
    <p>Error loading impressions information:</p>
    <pre>{props.error?.message}</pre>
  </div>
);

/**
 * Impressions tab content.
 *
 * Renders the card title.
 * Contextually warning about only valid on non-editable, non-empty text.
 * Shows the interactive Sunburst chart and category tree for the
 * results returned by the tagger.
 */
const Impressions = () => {
  const editing = useEditorState();
  const text = useEditorText();
  const tagging = useTaggerResults();
  let content;
  if (editing || text.length === 0 || tagging === null) {
    content = (
      <div className="alert alert-warning m-5 shadow d-flex align-items-center">
        <span className="material-icons">warning</span>
        <span className="ms-1">
          These tools is not valid when editing is enabled or there is no
          content.
        </span>
      </div>
    );
  } else if (typeof tagging === "number") {
    content = (
      <div className="p-3 m-2">
        <ProgressBar
          striped
          variant="info"
          now={tagging ?? 0}
          label={`${tagging ?? 0}%`}
        />
      </div>
    );
  } else if (tagging.isError) {
    content = (
      <Alert variant="danger" className="m-5 shadow">
        <Alert.Heading className="d-flex align-items-center">
          <span className="material-icons">error</span>
          <span className="ms-1">Error:</span>
        </Alert.Heading>
        <span>{tagging.html_content}</span>
      </Alert>
    );
  }
  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Manage Readers&apos; Impressions</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <React.Suspense fallback={<Spinner animation={"border"} />}>
            <Subscribe>
              <div className="impressions-content flex-grow-1 p-3">
                {content ?? <SunburstChart width={400} />}
                <CategoryTree />
              </div>
            </Subscribe>
          </React.Suspense>
        </ErrorBoundary>
      </Card.Body>
    </Card>
  );
};
export default Impressions;
