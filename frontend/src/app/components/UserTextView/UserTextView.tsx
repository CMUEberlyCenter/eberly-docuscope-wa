import classNames from "classnames";
import { type FC, type HTMLProps, useEffect, useState } from "react";
import {
  ButtonGroup,
  Dropdown,
  DropdownButton,
  OverlayTrigger,
  Placeholder,
  Tooltip,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import NoEditIcon from "../../assets/icons/no_edit_icon.svg?react";
import {
  useFileText,
  useInitiateUploadFile,
} from "../FileUpload/FileUploadContext";
import { useReviewContext } from "../Review/ReviewContext";
import { TaskViewerButton } from "../TaskViewer/TaskViewer";
import "./UserTextView.scss";
import { usePicker } from "../FileUpload/PickerContex";

type UserTextViewProps = HTMLProps<HTMLDivElement>;
/**
 * Component for displaying user's read only draft with sentence highlighting.
 * This sentence highlighting expects a list of ids that exist in the draft
 * as would be returned by the AI service.
 */
export const UserTextView: FC<UserTextViewProps> = ({
  className,
  ...props
}) => {
  const uploadFile = useInitiateUploadFile();
  const gdocImport = usePicker();
  // const uploadedFile = useUploadFile();
  // const setUploadErrors = useSetUploadErrors();
  const upload = useFileText();

  const ctx = useReviewContext();
  const { t } = useTranslation();
  const cl = classNames(className, "d-flex flex-column");
  const [text, setText] = useState<string>("");
  // TODO make this so that it is aware of the previous number of levels and
  // removes them instead of hard coding.  As there is only 2 levels
  // of highlighting, this is not a big deal for now.
  const maxHighlightLevels = 2;
  useEffect(() => {
    setText(ctx?.text /*?? prose*/ ?? upload ?? ""); // if custom tool text use that, otherwise use prose
  }, [/*prose,*/ ctx, upload]);

  useEffect(() => {
    if (!text) return;
    const highlightClasses = [
      "highlight",
      ...Array(maxHighlightLevels)
        .keys()
        .map((i) => `highlight-${i}`),
    ];
    document.querySelectorAll(".user-text .highlight").forEach((ele) => {
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
    document.querySelectorAll(".user-text .no-blur").forEach((ele) => {
      ele.classList.remove("no-blur");
    });

    // add no-blur to the paragraphs that are focused.
    // This will cause other paragraphs to blur through css.
    if (ctx?.paragraphs && ctx.paragraphs.length > 0) {
      ctx.paragraphs.forEach((id) => {
        document.getElementById(id)?.classList.add("no-blur");
      });
    }
    document.querySelector(".user-text .highlight")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [ctx, text]);

  return (
    <main className={cl} {...props}>
      <header className="d-flex justify-content-between align-items-center border rounded-top bg-light px-3">
        <ButtonGroup>
          <DropdownButton
            as={ButtonGroup}
            title={t("editor.menu.file")}
            variant="light"
          >
            <Dropdown.Item eventKey={"open"} onClick={() => uploadFile()}>
              {t("editor.menu.open")}
            </Dropdown.Item>
            <Dropdown.Item
              eventKey={"gdoc"}
              onClick={() => gdocImport((doc) => console.log(doc))}
            >
              gdoc
            </Dropdown.Item>
          </DropdownButton>
        </ButtonGroup>
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
      <article className="overflow-auto border-top flex-grow-1">
        {text.trim() === "" ? (
          <Placeholder></Placeholder>
        ) : (
          <div
            className={classNames("p-2 flex-grow-1 user-text")}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        )}
      </article>
    </main>
  );
};
