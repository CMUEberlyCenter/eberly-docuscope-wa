import { useEffect, useState } from "react";
import {
  OnTopicDataTools,
  OnTopicVisualization,
} from "@cmu-eberly-center/eberly-ontopic-visualization";
import { highlightSentence } from "../../service/topic.service";


const DocuScopeOnTopic = ({ sentences, text, htmlSentences }: {
  sentences: unknown;
  text: string;
  htmlSentences: string[][];
}) => {
  const dataTools = new OnTopicDataTools();

  const [textdata, setTextData] = useState(dataTools.getInitialData());
  const [paragraphIndex, setParagraphIndex] = useState(-1);
  const [sentenceIndex, setSentenceIndex] = useState(-1);
  const [sentenceDetails, setSentenceDetails] = useState<null | string>(null);

  useEffect(() => {
    setParagraphIndex(-1);
    setSentenceIndex(-1);
    setTextData({ plain: text, sentences })
  }, [sentences, text]);
  useEffect(() => {
    if (paragraphIndex < 0 || sentenceIndex < 0) {
      setSentenceDetails(null);
    } else {
      setSentenceDetails(htmlSentences.at(paragraphIndex)?.at(sentenceIndex)?.replaceAll('\\"', '"') ?? null);
    }
  }, [htmlSentences, paragraphIndex, sentenceIndex])

  const onHandleSentence = (pIndex: number, sIndex: number/*, block: unknown, sentence: unknown, topic: string*/): void => {
    highlightSentence(pIndex, sIndex);
    setParagraphIndex(pIndex);
    setSentenceIndex(sIndex)
  }
  return (
    <div className="ontopic-container">
      <div className="ontopic-content">
        <OnTopicVisualization
          mode="SENTENCE"
          singlepane={true}
          onFlip={undefined}
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
        <div
          className="ontopic-details">
          You may lose <b>clarity</b> if you try to pack too many ideas into a sentence.<br />
          This panel displays each of your sentences as a sequence of noun phrases appearing before and after the main verb. Focus on the sentences with many noun phrases before the main verb but also after.  Click on the sentence line on the left to see your actual sentence.
          <br /><br /> Read the sentence aloud when feeling. If you stumble or run out of breath, you are most likely stuffing too much information into a single sentence.
          <br /><br />
          There is nothing wrong with <b>be verbs</b> to signal &quot;existence&quot;. But an overreliance on the <b>be verbs</b> can result in weak writing. If you find you have too many <b>be verbs</b>, try to revise some of the sentences with <b>active verbs</b>.
        </div>

        {sentenceDetails ? (
          <div className="ontopic-explanation"
            dangerouslySetInnerHTML={{ __html: sentenceDetails }} />) :
          (<div className="ontopic-explanation">
            <p>Select a sentence to see its composition</p>
          </div>)
        }
      </div>
    </div>
  );
}
export default DocuScopeOnTopic;
/**
 *
 */
// class DocuScopeOnTopico extends Component {
/**
 *
 */
// constructor(props) {
//   super(props);

//   this.dataTools = new OnTopicDataTools();

//   this.state = {
//     locked: false,
//     invalidated: false,
//     flipped: false,
//     mode: "SENTENCE",
//     textdata: this.dataTools.getInitialData(),
//     loading: false,
//     paragraphIndex: -1,
//     sentenceIndex: -1,
//   };

//   this.onHandleTopic = this.onHandleTopic.bind(this);
//   this.onHandleSentence = this.onHandleSentence.bind(this);
//   // this.onSentenceChange = this.onSentenceChange.bind(this);
// }

/**
 *
 */
// componentDidUpdate(prevProps) {
//   if (
//     prevProps.text !== this.props.text ||
//     prevProps.sentences !== this.props.sentences
//   ) {
//     this.prep(this.props.sentences, this.props.text);
//   }
// }

/**
 *
 */
// prep(data, plain) {
//   console.log("prep (" + this.state.mode + ")");

//   const newData = this.dataTools.copyData(this.state.textdata);
//   newData.plain = plain;

//   if (this.state.mode === "SENTENCE") {
//     newData.sentences = data;

//     this.setState({
//       sentence: null,
//       loading: false,
//       textdata: newData,
//       invalidated: false,
//       paragraphIndex: -1,
//       sentenceIndex: -1,
//     });
//   }
// }

/**
 *
 */
// onHandleTopic(topicId, isGlobal, count) {
//   console.log(
//     "onHandleTopic (" +
//     topicId +
//     "," +
//     isGlobal +
//     "," +
//     count +
//     ") => Dummy for now"
//   );
// }

/**
 *
 */
// onHandleSentence(aParagraphIndex, aSentenceIndex, aBlock, aSentence, aTopic) {
//   if (aTopic) {
//     highlightSentence(aParagraphIndex, aSentenceIndex, [
//       aTopic,
//     ]);
//   } else {
//     highlightSentence(aParagraphIndex, aSentenceIndex);
//   }

//   this.setState({
//     paragraphIndex: aParagraphIndex,
//     sentenceIndex: aSentenceIndex,
//   });
// }

/**
 *
 */
// onSentenceChange() {
//   console.log("onSentenceChange ()");

//   if (this.props.setStatus) {
//     this.props.setStatus(
//       "Selected sentence, at paragraph " +
//       this.state.sentence.paragraphIndex +
//       ", and sentence " +
//       this.state.sentence.sentenceIndex +
//       ", with main verb: " +
//       this.state.sentence.verb
//     );
//   } else {
//     console.log("No status update method available");
//   }
// }

/**
 *
 */
// generateSentenceDetails(aParagraphIndex: number, aSentenceIndex: number) {
//   //console.log ("generateSentenceDetails ("+aParagraphIndex+","+aSentenceIndex+")");

//   if (aParagraphIndex == -1 || aSentenceIndex == -1) {
//     //console.log ("No valid paragraph or sentence index selected");
//     return null;
//   }

//   if (
//     this.props.htmlSentences &&
//     this.props.htmlSentences.length < aParagraphIndex
//   ) {
//     console.log("Error: paragraphIndex out of range");
//     return null;
//   }

//   let aParagraph = this.props.htmlSentences[aParagraphIndex];

//   if (!aParagraph) {
//     console.log("Invalid paragraph selected");
//     return null;
//   }

//   //console.log (aParagraph);

//   let aSentence = aParagraph[aSentenceIndex];

//   if (!aSentence) {
//     console.log("Invalid sentence selected");
//     return null;
//   }

//   let sentencedetails = aSentence.replaceAll('\\"', '"');

//   //console.log (sentencedetails);

//   return (
//     <div
//       className="ontopic-explanation"
//       dangerouslySetInnerHTML={{ __html: sentencedetails }}
//     ></div>
//   );
// }

/**
 *
 */
// render() {
//   const onTopicHelp =
//     'You may lose <b>clarity</b> if you try to pack too many ideas into a sentence.<br/> This panel displays each of your sentences as a sequence of noun phrases appearing before and after the main verb. Focus on the sentences with many noun phrases before the main verb but also after.  Click on the sentence line on the left to see your actual sentence. <br/><br/> Read the sentence aloud when feeling. If you stumble or run out of breath, you are most likely stuffing too much information into a single sentence. <br/><br/>  There is nothing wrong with <b>be verbs</b> to signal "existence". But an overreliance on the <b>be verbs</b> can result in weak writing. If you find you have too many <b>be verbs</b>, try to revise some of the sentences with <b>active verbs</b>.';

//   let sentencedetails = this.generateSentenceDetails(
//     this.state.paragraphIndex,
//     this.state.sentenceIndex
//   );

//   if (!sentencedetails) {
//     sentencedetails = (
//       <div className="ontopic-explanation">
//         <p>Select a sentence to see its composition</p>
//       </div>
//     );
//   }

// }
// }

// export default DocuScopeOnTopic;
