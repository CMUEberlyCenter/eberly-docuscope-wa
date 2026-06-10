import { createContext, use, useState, type FC, type ReactNode } from "react";
import { ListGroup, Toast } from "react-bootstrap";
import { useTranslation } from "react-i18next";

type Message =
  | { type: "error"; message: string; error: unknown }
  | { type: "warning"; message: string };

const FileImportErrorContext = createContext<{
  errors: Message[];
  setErrors: (errors: Message[]) => void;
  addError: (...error: Message[]) => void;
  showErrors: boolean;
  setShowErrors: (show: boolean) => void;
  showError: (...error: Message[]) => void;
  clearErrors: () => void;
}>({
  errors: [],
  setErrors: () => {},
  addError: () => {},
  showErrors: false,
  setShowErrors: () => {},
  showError: () => {},
  clearErrors: () => {},
});
export const useFileImportErrors = () => use(FileImportErrorContext);

export const FileImportErrorProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Message[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const showError = (...error: Message[]) => {
    setErrors(error);
    setShowErrors(true);
  };

  const clearErrors = () => {
    setErrors([]);
    setShowErrors(false);
  };

  return (
    <FileImportErrorContext
      value={{
        errors,
        setErrors,
        addError: (...error) => setErrors((prev) => [...prev, ...error]),
        showErrors,
        setShowErrors,
        showError,
        clearErrors,
      }}
    >
      {children}
      <Toast
        bg="light"
        className="position-absolute start-50 bottom-0 translate-middle"
        show={showErrors}
        onClose={() => setShowErrors(!showErrors)}
      >
        <Toast.Header className="justify-content-between">
          {t("editor.upload.error.title")}
        </Toast.Header>
        <Toast.Body>
          <p>{t("editor.upload.error.overview")}</p>
          <ListGroup className="overflow-auto" style={{ maxHeight: "15rem" }}>
            {errors.map((msg) => (
              <ListGroup.Item
                key={crypto.randomUUID()}
                variant={msg.type === "error" ? "danger" : "warning"}
              >
                {msg.type === "error"
                  ? t("editor.upload.error.error", msg)
                  : t("editor.upload.error.warning", msg)}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Toast.Body>
      </Toast>
    </FileImportErrorContext>
  );
};
