import { Subscribe } from "@react-rxjs/core";
import * as React from "react";
import { ProgressBar, Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useEditorState } from "../../service/editor-state.service";
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
  const tagging = useTaggerResults();
  let content;
  if (editing) {
    content = (<div className="alert alert-warning">
      These tools is not valid when editing is enabled.
    </div>);
  } else if (!tagging || typeof(tagging) === 'number') {
    content = (<div className="p-3"><ProgressBar striped variant="info" now={tagging??0} label={`${tagging??0}%`} /></div>);
  }
  return (
    <div className="impressions d-flex h-100 w-100 flex-column justify-content-start align-items-stretch">
      <TabTitle title="Manage Readers' Impressions" />
      {/*<div className="p-2 lh-lg"></div>*/}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
    <React.Suspense fallback={<Spinner animation={"border"} />}>
      <Subscribe>
      {content ??
        (<div className="impressions-content overflow-auto flex-grow-1 p-3">
          <SunburstChart width={400} />
          <h3 className="mt-2">Dictionary Categories</h3>
          <CategoryTree />
          {/*<iframe className="docuscopeframe" src={docuscope}></iframe>*/}
        </div>)}
      {/*<div className="impressions-detail"></div>*/}
      </Subscribe>
      </React.Suspense>
      </ErrorBoundary>
    </div>
  )
};
export default Impressions;
