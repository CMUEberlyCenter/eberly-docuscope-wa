/**
 * @fileoverview Contents of the Clarity tools.
 */
import { FC, Suspense } from "react";
import { Alert, Card } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import {
  OnTopicDataTools,
  OnTopicVisualization,
} from "@cmu-eberly-center/eberly-ontopic-visualization";
import { bind } from "@react-rxjs/core";
import { useEffect, useState } from "react";
import { combineLatest, filter, map } from "rxjs";
import { currentTool$ } from "../../service/current-tool.service";
import { lockedEditorText$ } from "../../service/editor-state.service";
import { useOnTopic } from "../../service/onTopic.service";
import { highlightSentence } from "../../service/topic.service";
import TabTitle from "../TabTitle/TabTitle";

import "./Clarity.scss";

/** Error feedback component for clarity tool. */
const ClarityErrorFallback = (props: { error?: Error }) => (
  <Alert variant="danger">
    <p>Error loading Clarity data:</p>
    <pre>{props.error?.message}</pre>
  </Alert>
);
const clarityText = combineLatest({
  tool: currentTool$,
  text: lockedEditorText$,
}).pipe(
  filter((c) => c.tool === "clarity"),
  map((c) => c.text)
);
const [useClarityText /*clarityText$*/] = bind(clarityText, "");

const cleanAndRepairSentenceData = (
  data?: { html_sentences?: string[][] } | null
) => {
  if (!data || !data.html_sentences) return null;
  return data.html_sentences.map((paragraph) =>
    paragraph.filter((sentence) => sentence !== "")
  ); // sentence.trim()?
};

const dataTools = new OnTopicDataTools();

const Clarity: FC = () => {
  const [textdata, setTextData] = useState(dataTools.getInitialData());
  const [paragraphIndex, setParagraphIndex] = useState(-1);
  const [sentenceIndex, setSentenceIndex] = useState(-1);
  const [sentenceDetails, setSentenceDetails] = useState<null | string>(null);
  const text = useClarityText();
  const [htmlSentences, setHtmlSentences] = useState<null | string[][]>(null);
  const data = useOnTopic();
  useEffect(() => setHtmlSentences(cleanAndRepairSentenceData(data)), [data]);

  useEffect(() => {
    setParagraphIndex(-1);
    setSentenceIndex(-1);
    setTextData({ plain: text, sentences: data?.clarity });
  }, [data, text]);

  useEffect(() => {
    if (paragraphIndex < 0 || sentenceIndex < 0) {
      setSentenceDetails(null);
    } else {
      setSentenceDetails(
        htmlSentences
          ?.at(paragraphIndex)
          ?.at(sentenceIndex)
          ?.replaceAll('\\"', '"') ?? null
      );
    }
  }, [htmlSentences, paragraphIndex, sentenceIndex]);

  const onHandleSentence = (
    pIndex: number,
    sIndex: number /*, block: unknown, sentence: unknown, topic: string*/
  ): void => {
    highlightSentence(pIndex, sIndex);
    setParagraphIndex(pIndex);
    setSentenceIndex(sIndex);
  };

  return (
    <Card as="section" className="clarity overflow-hidden m-1 mh-100">
      <Card.Header>
        <TabTitle>Polish Your Sentences for Clarity</TabTitle>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <ErrorBoundary FallbackComponent={ClarityErrorFallback}>
          <Suspense>
            <div className="ontopic-container">
              <div className="ontopic-content">
                <OnTopicVisualization
                  mode="SENTENCE"
                  singlepane={true}
                  onFlip={() => undefined}
                  onHandleTopic={() => undefined}
                  onHandleSentence={onHandleSentence}
                  loading={false}
                  invalidated={false}
                  textdata={textdata}
                  highlight={"#E2D2BB"}
                />
              </div>
              <div className="ontopic-help">
                <div className="ontopic-legend">
                  <span className="topic-legend-item">
                    <div className="box-green"></div>Noun phrase
                  </span>
                  <span className="topic-legend-item">
                    <div className="box-red"></div>Action verb
                  </span>
                  <span className="topic-legend-item">
                    <div className="box-blue"></div>be verb
                  </span>
                </div>
                <div className="ontopic-details">
                  You may lose <b>clarity</b> if you try to pack too many ideas
                  into a sentence.
                  <br />
                  This panel displays each of your sentences as a sequence of
                  noun phrases appearing before and after the main verb. Focus
                  on the sentences with many noun phrases before the main verb
                  but also after. Click on the sentence line on the left to see
                  your actual sentence.
                  <br />
                  <br /> Read the sentence aloud when feeling. If you stumble or
                  run out of breath, you are most likely stuffing too much
                  information into a single sentence.
                  <br />
                  <br />
                  There is nothing wrong with <b>be verbs</b> to signal
                  &quot;existence&quot;. But an overreliance on the{" "}
                  <b>be verbs</b> can result in weak writing. If you find you
                  have too many <b>be verbs</b>, try to revise some of the
                  sentences with <b>active verbs</b>.
                </div>

                {sentenceDetails ? (
                  <div
                    className="ontopic-explanation"
                    dangerouslySetInnerHTML={{ __html: sentenceDetails }}
                  />
                ) : (
                  <div className="ontopic-explanation">
                    <p>Select a sentence to see its composition</p>
                  </div>
                )}
              </div>
            </div>
          </Suspense>
        </ErrorBoundary>
      </Card.Body>
      {/* <Card.Footer>Status: {error ? error : (isMutating ? "Retrieving Results..." : "Data Retrieved.")}</Card.Footer> */}
    </Card>
  );
};

export default Clarity;
