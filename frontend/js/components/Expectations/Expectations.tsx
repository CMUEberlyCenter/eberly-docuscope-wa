import { Subscribe } from "@react-rxjs/core";
import React, { useId, useState } from "react";
import { Alert, Card, Collapse } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { ExpectationRule, useExpectations } from "../../service/expectations.service";
import TabTitle from "../TabTitle/TabTitle";
import './Expectations.scss';

interface RuleProps {
  rule: ExpectationRule;
}
const Rule = (props: RuleProps) => {
  const ref = useId();
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <span className="cursor-pointer expectations-rule" onClick={() => setExpanded(!expanded)}>{props.rule.name}</span>
      <Collapse in={expanded}>
        <Card onClick={() => setExpanded(false)}>
          <Card.Body>
          <Card.Text dangerouslySetInnerHTML={{ __html: props.rule.description }} />
          </Card.Body>
        </Card>
      </Collapse>
      {props.rule.children.length > 0 ? (
        <ol>
          {props.rule.children.map((child: ExpectationRule, i) => (<Rule key={`${ref}-${i}`} rule={child} />))}
        </ol>
      ) : ''}
    </li>)
}
const ErrorFallback = (props: { error?: Error }) => (
  <Alert variant="danger">
    <p>Error loading expectations:</p>
    <pre>{props.error?.message}</pre>
  </Alert>
);

const Expectations = () => {
  const expectations = useExpectations();
  const ref = useId();
  return (
    <section className="d-flex flex-column overflow-hidden expectations h-100 w-100 justify-content-start align-items-stretch">
      <TabTitle title="Meet Readers' Expectations" />
      <Card className="overflow-auto flex-grow-1">
        <Card.Body>
          <Subscribe>
            <Card.Title>{expectations?.name ?? 'Loading...'}</Card.Title>
            <Card.Subtitle>
              Respond to the following questions to meet the readers&apos;
              expectations. The sentences that you write to respond to each
              question include a unique topic cluster that consists of a set of
              words and phrases. DocuScope will automatically highlight sentences
              in your draft that most likely match these expectations.
            </Card.Subtitle>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <ol className="expectations-list mt-3">
                {expectations?.rules.map((rule, i) => (<Rule key={`${ref}-${i}`} rule={rule} />)) ?? ''}
              </ol>
            </ErrorBoundary>
          </Subscribe>
        </Card.Body>
      </Card>
      {/*<Card>
        <Card.Body>
          <Card.Title>About this Group of Expectations</Card.Title>
          <div className="overflow-auto">
            {selectedRule
              ? (<p dangerouslySetInnerHTML={{ __html: selectedRule.description }} />)
              : (<Alert variant="info">No Selected Group.</Alert>)}
          </div>
        </Card.Body>
            </Card>*/}
    </section>
  )
}
export default Expectations;
