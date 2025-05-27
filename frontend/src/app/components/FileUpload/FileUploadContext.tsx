import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { ListGroup, Toast } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { FileUpload } from "./FileUpload";

type FileUploadContext = {
  file: File | null;
};
const FileUploadContext = createContext<File | null>(null);
export const useUploadFile = () => useContext(FileUploadContext);
const InitiateOpenFileDispatch = createContext<() => void>(() => {});
export const useInitiateUploadFile = () => useContext(InitiateOpenFileDispatch);
const SetErrorsDispatch = createContext<(errors: Message[]) => void>(() => {});
export const useSetUploadErrors = () => useContext(SetErrorsDispatch);

const loadSaveFileOps = {
  id: "myprose",
  types: [
    {
      accept: {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          [".docx"],
      },
    },
  ],
};

type Message =
  | { type: "error"; message: string; error: unknown }
  | { type: "warning"; message: string };

export const FileUploadProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const [showUpload, setShowUpload] = useState(false);
  const [upload, setUpload] = useState<File | null>(null);
  const [errors, setErrors] = useState<Message[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const uploadFile = useCallback(async () => {
    if (
      "showOpenFilePicker" in window &&
      typeof window.showOpenFilePicker === "function"
    ) {
      try {
        const [handle]: FileSystemFileHandle[] =
          await window.showOpenFilePicker(loadSaveFileOps);
        const file = await handle.getFile();
        setUpload(file);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // Skip cancel.
        }
        if (err instanceof DOMException && err.name === "SecurityError") {
          // Security error, show custom upload dialog.  Usually due to being in a cross-orgin iframe.
          setShowUpload(true);
          return;
        }
        console.error(err);
        if (err instanceof Error) {
          setErrors([{ type: "error", message: err.message, error: err }]);
          setShowErrors(true);
        }
      }
    } else {
      setShowUpload(true);
    }
  }, []);

  const setErrorsCallback = useCallback(
    (newErrors: Message[]) => {
      setErrors(newErrors);
      setShowErrors(true);
    },
    [setErrors, setShowErrors]
  );
  return (
    <FileUploadContext.Provider value={upload}>
      <InitiateOpenFileDispatch.Provider value={uploadFile}>
        <SetErrorsDispatch.Provider value={setErrorsCallback}>
          {children}
          <FileUpload
            show={showUpload}
            onHide={() => setShowUpload(false)}
            onFile={setUpload}
          />
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
              <ListGroup>
                {errors.map((msg, i) => (
                  <ListGroup.Item
                    key={i}
                    variant={msg.type === "error" ? "danger" : "warning"}
                  >
                    {msg.type === "error"
                      ? t("editor.upload.error.error")
                      : t("editor.upload.error.warning")}{" "}
                    {(msg.message === "Security Error" &&
                      t("editor.upload.error.security")) ||
                      (msg.message === "Failed Write" &&
                        t("editor.upload.error.failed_write")) ||
                      (msg.type === "error" &&
                        msg.error instanceof TypeError &&
                        t("editor.upload.error.not_docx", {
                          file: msg.message,
                        })) ||
                      msg.message}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Toast.Body>
          </Toast>
        </SetErrorsDispatch.Provider>
      </InitiateOpenFileDispatch.Provider>
    </FileUploadContext.Provider>
  );
};
