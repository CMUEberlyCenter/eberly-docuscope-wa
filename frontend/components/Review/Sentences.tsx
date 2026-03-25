import classNames from "classnames";
import DOMPurify from "dompurify";
import { type FC, type HTMLProps, useEffect, useReducer } from "react";
import { type ButtonProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Icon from "../../assets/icons/sentence_density_icon.svg?react";
import { cleanAndRepairSentenceData } from "../../src/lib/OnTopicData";
import { isErrorData } from "../../src/lib/ReviewResponse";
import { useOnTopicData } from "../ReviewContext/OnTopicDataContext";
import { ReviewToolCard } from "../ReviewContext/ReviewContext";
import { ToolButton } from "../ToolButton/ToolButton";
import "./Sentences.scss";

export {
  OnTopicDataProvider as SentencesDataProvider,
  OnTopicSnapshotProvider as SentencesSnapshotProvider,
} from "../ReviewContext/OnTopicDataContext";

/**
 * Add highlight to the specified sentence in a given paragraph.
 * Should use dispatch to set the context instead of direct DOM manipulation but
 * this uses a different sentence location scheme based on the data attributes used by onTopic.
 * @param aParagraphIndex 0 based index.
 * @param aSentenceIndex 0 based index.
 */
function highlightSentence(aParagraphIndex: number, aSentenceIndex: number) {
  document.querySelectorAll(`.user-text .highlight`).forEach((ele) => {
    ele.classList.remove("highlight", "highlight-0");
  });

  const element = document.querySelector(
    `.user-text .sentence[data-ds-paragraph="${aParagraphIndex}"][data-ds-sentence="${aSentenceIndex}"]`
  );
  element?.classList.add("highlight", "highlight-0");
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Button component for selecting the Sentences tool. */
export const SentencesButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  const { t: it } = useTranslation("instructions");
  return (
    <ToolButton
      {...props}
      title={t("sentences.title")}
      tooltip={it("sentence_density_scope_note")}
      icon={<Icon />}
    />
  );
};

type SentenceIconProps = HTMLProps<HTMLSpanElement>;
/** Icons component for topic text, a square. */
const TopicTextIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "topic-text-icon")}>
    ■
  </span>
);
/** Icons component for active verbs, a triangle. */
const ActiveVerbIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "active-verb-icon")}>
    ▲
  </span>
);
/** Icons component for be verbs, a circle. */
const BeVerbIcon: FC<SentenceIconProps> = ({ className, ...props }) => (
  <span {...props} className={classNames(className, "be-verb-icon")}>
    ●
  </span>
);

/** Legend component for sentence icons. */
const Legend: FC = () => {
  const { t } = useTranslation("review");
  return (
    <div
      className="p-1 px-3 d-inline-flex flex-row flex-wrap"
      style={{ columnGap: "3rem" }}
    >
      <div className="topic-text">
        <TopicTextIcon />{" "}
        <span className="topic-text">{t("sentences.legend.noun")}</span>
      </div>
      <div>
        <ActiveVerbIcon />{" "}
        <span className="active-verb">{t("sentences.legend.action")}</span>
      </div>
      <div>
        <BeVerbIcon />{" "}
        <span className="be-verb">{t("sentences.legend.passive")}</span>
      </div>
    </div>
  );
};

/** Sentences review tool component. */
export const Sentences: FC<HTMLProps<HTMLDivElement>> = (props) => {
  const { review, pending } = useOnTopicData();
  const { t } = useTranslation("review");
  const htmlSentences = !isErrorData(review)
    ? cleanAndRepairSentenceData(review?.response)
    : null;
  const [selected, dispatch] = useReducer(
    (
      state: { paragraph: number; sentence: number; details: string | null },
      action: { paragraph: number; sentence: number }
    ) => {
      const details =
        action.paragraph < 0 || action.sentence < 0
          ? null
          : (htmlSentences
              ?.at(action.paragraph - 1)
              ?.at(action.sentence - 1)
              ?.replaceAll('\\"', '"') ?? null);
      return {
        ...state,
        paragraph: action.paragraph,
        sentence: action.sentence,
        details,
      };
    },
    { paragraph: -1, sentence: -1, details: null }
  );
  const textData = !isErrorData(review) ? review?.response.clarity : undefined;

  const onHandleSentence = (paragraph: number, sentence: number) => {
    dispatch({ paragraph, sentence });
    highlightSentence(paragraph, sentence);
  };
  useEffect(() => {
    onHandleSentence(-1, -1);
  }, [review]);

  return (
    <ReviewToolCard
      title={t("sentences.title")}
      instructionsKey={"clarity"}
      errorMessage={t("sentences.error")}
      review={review}
      isPending={pending}
      className="sentences"
      {...props}
    >
      <Legend />
      <div className="py-1 overflow-auto sentence-display mb-1">
        {selected.details ? (
          <div
            // eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(selected.details),
            }}
          />
        ) : (
          <p>{t("sentences.select")}</p>
        )}
      </div>
      {
        <div className="overflow-auto w-100 h-100">
          <table className="sentence-data align-middle table-hover w-100">
            <tbody>
              {textData?.map((sentence, i) =>
                typeof sentence === "string" ? (
                  /* eslint-disable-next-line @eslint-react/no-array-index-key */
                  <tr key={`p${i}`}>
                    <td className="paragraph-count" colSpan={3}>
                      &nbsp;
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={`p${sentence.at(0)}-s${sentence.at(1)}`}
                    className={classNames(
                      "selectable",
                      selected.paragraph === sentence.at(0) &&
                        selected.sentence === sentence.at(1)
                        ? "table-active"
                        : ""
                    )}
                    onClick={() => onHandleSentence(sentence[0], sentence[1])}
                  >
                    <td className="text-end">
                      {sentence[2].sent_analysis.NPS.slice(
                        0,
                        sentence[2].sent_analysis.L_NPS
                      ).map((np, j) => (
                        /* eslint-disable-next-line @eslint-react/no-array-index-key */
                        <TopicTextIcon key={`s${i}-lnp${j}`} title={np} />
                      ))}
                    </td>
                    <td className="text-center">
                      {sentence[2].sent_analysis.BE_VERB ? (
                        <BeVerbIcon
                          title={sentence[2].sent_analysis.TOKENS.filter(
                            ({ is_root }) => is_root
                          )
                            .map(({ text }) => text)
                            .join(" ")}
                        />
                      ) : /* there exists a root that is a verb in the sentence Tokens */
                      sentence[2].sent_analysis.TOKENS.some(
                          ({ is_root }, i) =>
                            is_root &&
                            sentence[2].text_w_info.at(i)?.at(0) === "VERB"
                        ) ? (
                        <ActiveVerbIcon
                          title={sentence[2].sent_analysis.TOKENS.filter(
                            ({ is_root }) => is_root
                          )
                            .map(({ text }) => text)
                            .join(" ")}
                        />
                      ) : null}
                    </td>
                    <td className="text-start">
                      {sentence[2].sent_analysis.NPS.slice(
                        -sentence[2].sent_analysis.R_NPS
                      ).map((np, j) => (
                        /* eslint-disable-next-line @eslint-react/no-array-index-key */
                        <TopicTextIcon key={`s${i}-rnp${j}`} title={np} />
                      ))}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      }
    </ReviewToolCard>
  );
};
