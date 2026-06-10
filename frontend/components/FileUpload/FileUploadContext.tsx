import { convertToHtml } from "mammoth";
import {
  createContext,
  use,
  useCallback,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useFileImportErrors } from "./FileImportErrors";
import { useFileText, useFilename } from "./FileTextContext";
import { FileUpload } from "./FileUpload";
import { convertOptions } from "./convertOptions";

/** Context for initiating the file upload dialog. */
const InitiateOpenFileDispatchContext = createContext<() => void>(() => {});

/**
 * Hook for accessing the function to initiate the file upload dialog.
 * This is used to open the file picker dialog.
 */
export const useInitiateUploadFile = () => use(InitiateOpenFileDispatchContext);

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

/**
 * FileUploadProvider context component for handling essay uploads from the filesystem.
 */
export const FileUploadProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const { clearErrors, showError } = useFileImportErrors();
  const [showUpload, setShowUpload] = useState(false);
  const [, setFilename] = useFilename();
  const [, setText] = useFileText();
  const processFile = useCallback(
    (file: File) => {
      if (!file) {
        // This should not happen since the file picker only allows selecting files, but we check just in case.
        setFilename(null);
        return;
      }
      if (
        file.type !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        showError({
          type: "error",
          message: t("editor.upload.error.not_docx", { file: file.name }),
          error: new TypeError(file.name),
        });
        return;
      }
      clearErrors();
      setFilename(file.name);
      file
        .arrayBuffer()
        .then((arrayBuffer) =>
          convertToHtml({ arrayBuffer }, convertOptions).then(
            ({ value, messages }) => {
              if (messages.length) {
                showError(...messages);
                console.error(messages);
              }
              setText(value);
            }
          )
        )
        .catch((err) => {
          if (err instanceof Error) {
            showError({ type: "error", message: err.message, error: err });
            console.error(err);
          } else {
            console.error("Caught non-error", err);
          }
        });
    },
    [setFilename, setText, showError, t, clearErrors]
  );
  const uploadFile = useCallback(async () => {
    if (
      "showOpenFilePicker" in window &&
      typeof window.showOpenFilePicker === "function"
    ) {
      try {
        const [handle]: FileSystemFileHandle[] =
          await window.showOpenFilePicker(loadSaveFileOps);
        const file = await handle.getFile();
        processFile(file);
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
          showError({ type: "error", message: err.message, error: err });
        }
      }
    } else {
      setShowUpload(true);
    }
  }, [showError, processFile]);

  return (
    <InitiateOpenFileDispatchContext value={uploadFile}>
      {children}
      <FileUpload
        show={showUpload}
        onHide={() => setShowUpload(false)}
        onFile={processFile}
      />
    </InitiateOpenFileDispatchContext>
  );
};
