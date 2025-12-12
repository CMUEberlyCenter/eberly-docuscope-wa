import classNames from "classnames";
import { type FC, type HTMLProps } from "react";
import { ButtonGroup, Dropdown, DropdownButton } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useInitiateUploadFile } from "../FileUpload/FileUploadContext";
import { usePicker } from "../FileUpload/PickerContext";
import { TaskViewerButton } from "../TaskViewer/TaskViewer";
import { UneditableIcon } from "../UneditableIcon/UneditableIcon";
import { UserText } from "./UserText";
import "./UserTextView.scss";

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
  const showPicker = usePicker();

  const { t } = useTranslation();
  const cl = classNames(className, "d-flex flex-column");
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
            <Dropdown.Item eventKey={"gdoc"} onClick={() => showPicker(true)}>
              {t("editor.menu.gdoc")}
            </Dropdown.Item>
          </DropdownButton>
        </ButtonGroup>
        <TaskViewerButton />
        <UneditableIcon />
      </header>
      <UserText className="overflow-auto border-top flex-grow-1" />
    </main>
  );
};
