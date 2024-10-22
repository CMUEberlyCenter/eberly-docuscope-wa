import classNames from "classnames";
import escapeHtml from "escape-html";
import { FC, HTMLProps, useContext, useEffect, useState } from "react";
import { Placeholder } from "react-bootstrap";
import NoEditIcon from "../../assets/icons/no_edit_icon.svg?react";
import { useReview } from "../../service/review.service";
import { ReviewContext } from "../Review/ReviewContext";
import "./UserTextView.scss";
import { TaskViewerButton } from "../TaskViewer/TaskViewer";

type UserTextViewProps = HTMLProps<HTMLDivElement> & {
  /** The html string representing the user's draft. */
  prose: string;
};
/**
 * Component for displaying user's read only draft with sentence highlighting.
 * This sentence highlighting expects a list of strings that exist in the draft
 * as would be returned by the AI service.
 */
export const UserTextView: FC<UserTextViewProps> = ({
  prose,
  className,
  ...props
}) => {
  const review = useReview();
  const [content, setContent] = useState(prose);
  const ctx = useContext(ReviewContext);
  const cl = classNames(className, "d-flex flex-column");
  useEffect(() => {
    if (!ctx?.sentences || ctx.sentences.length <= 0) {
      setContent(prose);
    } else {
      const highlights = ctx.sentences
        .map(escapeHtml)
        .reduce(
          (prev, sentence) =>
            prev.replaceAll(
              sentence,
              `<span class="highlight">${sentence}</span>`
            ),
          prose
        );
      setContent(highlights);
    }
  }, [prose, ctx]);

  useEffect(() => {
    document.querySelector(".user-text .highlight")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [content]);

  return (
    <main className={cl} {...props}>
      <header className="d-flex justify-content-between align-items-center border rounded-top bg-light px-3">
        <TaskViewerButton />
        <NoEditIcon />
      </header>
      <article className="overflow-auto border-top">
        {typeof review !== "object" ? (
          <Placeholder></Placeholder>
        ) : (
          <div
            className="p-2 flex-grow-1 user-text"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </article>
    </main>
  );
};
