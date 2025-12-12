import { FC, HTMLProps, useEffect, useId, useState } from "react";
import { useFileText } from "../FileUpload/FileTextContext";
import { useReviewContext } from "../Review/ReviewContext";

type UserTextProps = HTMLProps<HTMLDivElement>;
/**
 * Component for displaying user's read only draft with sentence highlighting.
 * This sentence highlighting expects a list of ids that exist in the draft
 * as would be returned by the AI service.
 */
export const UserText: FC<UserTextProps> = ({ ...props }) => {
  const id = useId();
  const ctx = useReviewContext();
  const [fileText] = useFileText();
  const [content, setContent] = useState<string>(fileText?.trim() ?? "");
  // TODO make this so that it is aware of the previous number of levels and
  // removes them instead of hard coding.  As there is only 2 levels
  // of highlighting, this is not a big deal for now.
  const maxHighlightLevels = 2;

  useEffect(() => {
    setContent(ctx?.text?.trim() ?? fileText?.trim() ?? ""); // if custom tool text use that, otherwise use prose
  }, [fileText, ctx?.text]);

  useEffect(() => {
    if (!content) return;
    const highlightClasses = [
      "highlight",
      ...Array(maxHighlightLevels)
        .keys()
        .map((i) => `highlight-${i}`),
    ];
    document.querySelectorAll(`#${id}.user-text .highlight`).forEach((ele) => {
      ele.classList.remove(...highlightClasses);
    });
    if (ctx?.sentences && ctx.sentences.length > 0) {
      ctx.sentences.forEach((ids, index) => {
        ids.forEach((id) =>
          document
            .getElementById(id)
            ?.classList.add("highlight", `highlight-${index}`)
        );
      });
    }
    // remove blur by removing the no-blur classes.
    document.querySelectorAll(`#${id}.user-text .no-blur`).forEach((ele) => {
      ele.classList.remove("no-blur");
    });

    // add no-blur to the paragraphs that are focused.
    // This will cause other paragraphs to blur through css.
    if (ctx?.paragraphs && ctx.paragraphs.length > 0) {
      ctx.paragraphs.forEach((id) => {
        document.getElementById(id)?.classList.add("no-blur");
      });
    }
    // scroll to first highlight if it exists, otherwise scroll to first no-blur
    // else no scrolling.
    if (document.querySelectorAll(`#${id}.user-text .highlight`).length > 0) {
      document.querySelector(`#${id}.user-text .highlight`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else if (document.querySelector(`#${id}.user-text .no-blur`)) {
      document.querySelector(`#${id}.user-text .no-blur`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [ctx, content, id]);

  return (
    <article {...props}>
      <div
        id={id}
        className="user-text p-2"
        dangerouslySetInnerHTML={{ __html: content }}
      ></div>
    </article>
  );
};
