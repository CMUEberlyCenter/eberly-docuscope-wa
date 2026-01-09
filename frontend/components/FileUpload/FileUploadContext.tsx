import { convertToHtml } from "mammoth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
const InitiateOpenFileDispatch = createContext<() => void>(() => {});

/**
 * Hook for accessing the function to initiate the file upload dialog.
 * This is used to open the file picker dialog.
 */
export const useInitiateUploadFile = () => useContext(InitiateOpenFileDispatch);

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
 * @param param0.children - The children to render inside the provider.
 * @returns
 */
export const FileUploadProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const { showError } = useFileImportErrors();
  const [showUpload, setShowUpload] = useState(false);
  const [, setFilename] = useFilename();
  const [upload, setUpload] = useState<File | null>(null);
  const [, setText] = useFileText();
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
          showError({ type: "error", message: err.message, error: err });
        }
      }
    } else {
      setShowUpload(true);
    }
  }, []);
  useEffect(() => {
    if (!upload) {
      setFilename(null);
      return;
    }
    if (
      upload.type !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      showError({
        type: "error",
        message: t("editor.upload.error.not_docx", { file: upload.name }),
        error: new TypeError(upload.name),
      });
      return;
    }
    setFilename(upload.name);
    upload
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
  }, [upload]);

  return (
    <InitiateOpenFileDispatch.Provider value={uploadFile}>
      {children}
      <FileUpload
        show={showUpload}
        onHide={() => setShowUpload(false)}
        onFile={setUpload}
      />
    </InitiateOpenFileDispatch.Provider>
  );
};
