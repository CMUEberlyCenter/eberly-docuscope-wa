import classNames from "classnames";
import { FC, HTMLProps, useContext, useEffect } from "react";
import { OverlayTrigger, Placeholder, Tooltip } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import NoEditIcon from "../../assets/icons/no_edit_icon.svg?react";
import { ReviewContext } from "../Review/ReviewContext";
import { TaskViewerButton } from "../TaskViewer/TaskViewer";
import "./UserTextView.scss";

type UserTextViewProps = HTMLProps<HTMLDivElement> & {
  /** The tagged html string representing the user's draft. */
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
  const ctx = useContext(ReviewContext);
  const { t } = useTranslation();
  const cl = classNames(className, "d-flex flex-column");
  // TODO make this so that it is aware of the previous number of levels and
  // removes them instead of hard coding.
  const maxHighlightLevels = 2;
  useEffect(() => {
    const highlightClasses = [
      "highlight",
      ...Array(maxHighlightLevels)
        .keys()
        .map((i) => `highlight-${i}`),
    ];
    document.querySelectorAll(".user-text .highlight").forEach((ele) => {
      ele.classList.remove(...highlightClasses);
    });
    if (!ctx?.sentences || ctx.sentences.length <= 0) {
      return;
    }
    ctx.sentences.forEach((ids, index) => {
      ids.forEach((id) =>
        document
          .getElementById(id)
          ?.classList.add("highlight", `highlight-${index}`)
      );
    });
    document.querySelector(".user-text .highlight")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [prose, ctx]);

  return (
    <main className={cl} {...props}>
      <header className="d-flex justify-content-between align-items-center border rounded-top bg-light px-3">
        <TaskViewerButton />
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip>{t("editor.menu.no_edit")}</Tooltip>}
        >
          <NoEditIcon
            role="status"
            aria-label={t("editor.menu.no_edit")}
            title={t("editor.menu.no_edit")}
          />
        </OverlayTrigger>
      </header>
      <article className="overflow-auto border-top">
        {prose.trim() === "" ? (
          <Placeholder></Placeholder>
        ) : (
          <div
            className="p-2 flex-grow-1 user-text"
            dangerouslySetInnerHTML={{ __html: prose }}
          />
        )}
      </article>
    </main>
  );
};
