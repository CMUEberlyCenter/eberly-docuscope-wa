/**
 * @fileoverview The Impressions tools is used to display and interact with the
 * results of the DocuScope tagger for the given text.
 *
 * Users can click on the sunburst chart wedges to zoom in and out.
 * The category tree is expandable and selecting a category with the
 * checkbox will initiate highlighting in the tagged text view.
 */
import { Subscribe } from "@react-rxjs/core";
import { FC, Suspense } from "react";
import { Accordion, Alert, Card, ProgressBar, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import {
  useEditorState,
  useEditorText,
} from "../../service/editor-state.service";
import { useTaggerResults } from "../../service/tagger.service";
import CategoryTree from "../CategoryTree/CategoryTree";
import SunburstChart from "../SunburstChart/SunburstChart";
import TabTitle from "../TabTitle/TabTitle";

const ImpressionsErrorFallback = (props: { error?: Error }) => (
  <div role="alert" className="alert alert-danger">
    <p>Error loading Impressions information:</p>
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
const Impressions: FC = () => {
  const editing = useEditorState();
  const text = useEditorText();
  const tagging = useTaggerResults();
  let content;
  //let count;
  if (editing || text.length === 0 || tagging === null) {
    // alert box to show when entered text is empty or being edited
    content = (
      <div className="alert alert-warning m-5 shadow d-flex align-items-center">
        <span className="material-icons">warning</span>
        <span className="ms-1">
          These tools are not valid when editing is enabled or there is no text
          content.
        </span>
      </div>
    );
  } else if (typeof tagging === "number") {
    // progress bar to show on percent done update.
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
    // alert to show on tagger error.
    content = (
      <Alert variant="danger" className="m-5 shadow">
        <Alert.Heading className="d-flex align-items-center">
          <span className="material-icons">error</span>
          <span className="ms-1">Error:</span>
        </Alert.Heading>
        <span>{tagging.html_content}</span>
      </Alert>
    );
    //} else {
    //  count = tagging.patterns.filter(pat => pat.category !== '?').reduce((prev, data) => prev + data.patterns.reduce((p, pd) => p + pd.count, 0), 0).toLocaleString();
  }
  return (
    <Card as="section" className="overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Manage Readers&apos; Impressions</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <ErrorBoundary FallbackComponent={ImpressionsErrorFallback}>
          <Suspense fallback={<Spinner animation={"border"} />}>
            <Subscribe>
              <div className="impressions-content flex-grow-1 p-1">
                {content}
                <Accordion defaultActiveKey={["categories"]} alwaysOpen>
                  <Accordion.Item eventKey="sunburst">
                    <Accordion.Header>
                      <h4>Sunburst Chart</h4>
                    </Accordion.Header>
                    <Accordion.Body>
                      {content ? (
                        <span className="alert alert-warning shadow m-2">
                          No valid data to chart.
                        </span>
                      ) : (
                        <SunburstChart width={500} />
                      )}
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="categories">
                    <Accordion.Header>
                      <h4>Dictionary Categories</h4>
                      {/* openCategories ? '' :
                      <span className={`badge bg-${
                        count && !editing ? "primary" : "secondary"
                        } rounded-pill fs-6 ms-4`}
                      >{count ?? '-'}</span>*/}
                    </Accordion.Header>
                    <Accordion.Body>
                      <CategoryTree />
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </div>
            </Subscribe>
          </Suspense>
        </ErrorBoundary>
      </Card.Body>
    </Card>
  );
};
export default Impressions;
