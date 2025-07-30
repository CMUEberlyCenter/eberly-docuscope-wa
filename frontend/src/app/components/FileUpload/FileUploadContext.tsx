import { convertToHtml } from "mammoth";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ListGroup, Toast } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { FileUpload } from "./FileUpload";

/** Context for storing the uploaded file. */
const FileUploadContext = createContext<File | null>(null);
/** Hook for accessing the uploaded file. */
export const useUploadFile = () => useContext(FileUploadContext);
/** Context for initiating the file upload dialog. */
const InitiateOpenFileDispatch = createContext<() => void>(() => {});
/**
 * Hook for accessing the function to initiate the file upload dialog.
 * This is used to open the file picker dialog.
 */
export const useInitiateUploadFile = () => useContext(InitiateOpenFileDispatch);
const SetErrorsDispatch = createContext<(errors: Message[]) => void>(() => {});
/** Hook for accessing the function to set upload errors. */
export const useSetUploadErrors = () => useContext(SetErrorsDispatch);
/**
 * Context for the file text.
 * This is used to store the html translation of the uploaded file.
 */
const FileTextContext = createContext<string | null>(null);
/**
 * Hook for accessing the html translation of the uploaded file.
 */
export const useFileText = () => useContext(FileTextContext);

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

/**
 * FileUploadProvider context component for handling essay uploads from the filesystem.
 * @param param0.children - The children to render inside the provider.
 * @returns
 */
export const FileUploadProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const [showUpload, setShowUpload] = useState(false);
  const [upload, setUpload] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
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
  useEffect(() => {
    if (!upload) return;
    if (
      upload.type !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      setErrors([
        {
          type: "error",
          message: t("editor.upload.error.not_docx", { file: upload.name }),
          error: new TypeError(upload.name),
        },
      ]);
      setShowErrors(true);
      return;
    }
    upload
      .arrayBuffer()
      .then((arrayBuffer) =>
        convertToHtml({ arrayBuffer }, { styleMap: "u => u" }).then(
          ({ value, messages }) => {
            if (messages.length) {
              setErrors(messages);
              console.error(messages);
            }
            setText(value);
          }
        )
      )
      .catch((err) => {
        if (err instanceof Error) {
          setErrors([{ type: "error", message: err.message, error: err }]);
          console.error(err);
        } else {
          console.error("Caught non-error", err);
        }
      });
  }, [upload]);

  const setErrorsCallback = useCallback(
    (newErrors: Message[]) => {
      setErrors(newErrors);
      setShowErrors(true);
    },
    [setErrors, setShowErrors]
  );
  return (
    <FileUploadContext.Provider value={upload}>
      <FileTextContext.Provider value={text}>
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
      </FileTextContext.Provider>
    </FileUploadContext.Provider>
  );
};
