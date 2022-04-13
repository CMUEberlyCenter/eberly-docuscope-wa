import { Subscribe } from "@react-rxjs/core";
import * as React from "react";
import { Alert, ProgressBar, Spinner } from "react-bootstrap";
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

const Impressions = () => {
  const editing = useEditorState();
  const text = useEditorText();
  const tagging = useTaggerResults();
  let content;
  if (editing || text.trim().length === 0 || tagging === null) {
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
    <div className="impressions d-flex h-100 w-100 flex-column justify-content-start align-items-stretch">
      <TabTitle title="Manage Readers' Impressions" />
      {/*<div className="p-2 lh-lg"></div>*/}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <React.Suspense fallback={<Spinner animation={"border"} />}>
          <Subscribe>
            <div className="impressions-content overflow-auto flex-grow-1 p-3">
              {content ?? <SunburstChart width={400} />}
              <CategoryTree />
              {/*<iframe className="docuscopeframe" src={docuscope}></iframe>*/}
            </div>
            {/*<div className="impressions-detail"></div>*/}
          </Subscribe>
        </React.Suspense>
      </ErrorBoundary>
    </div>
  );
};
export default Impressions;
