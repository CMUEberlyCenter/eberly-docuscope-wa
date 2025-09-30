import "@googleworkspace/drive-picker-element";
import { convertToHtml } from "mammoth";
import {
  createContext,
  useContext,
  useRef,
  type FC,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useFileImportErrors } from "./FileImportErrors";
import { useFilename, useFileText } from "./FileTextContext";

// type PickerCallback = (doc?: google.picker.DocumentObject) => void;
// TODO file data
const PickerContext = createContext<(show: boolean) => void>(() => undefined);
export const usePicker = () => useContext(PickerContext);

export const PickerProvider: FC<{
  children: ReactNode;
  clientId?: string;
  apiKey?: string;
  appId?: string;
}> = ({ children, clientId, apiKey, appId }) => {
  const { t } = useTranslation();
  const filesApi = useRef(false);
  const { showError } = useFileImportErrors();
  const [, setText] = useFileText();
  const [, setFilename] = useFilename();

  const showPicker = (show: boolean) => {
    const element = document.querySelector("drive-picker");
    if (element) {
      console.log("Found existing picker element", element);
      element.visible = show || true;
      return;
    }
    if (!clientId) {
      showError({
        type: "error",
        message: t("editor.gdoc.error.google_client_id"),
        error: new ReferenceError("Google Client ID is not defined."),
      });
      console.warn("Google Client ID is not defined.");
      return;
    }
    if (!apiKey) {
      showError({
        type: "error",
        message: t("editor.gdoc.error.google_api_key"),
        error: new ReferenceError("Google API Key is not defined."),
      });
      console.warn("Google API Key is not defined.");
      return;
    }
    if (!appId) {
      showError({
        type: "error",
        message: t("editor.gdoc.error.google_app_id"),
        error: new ReferenceError("Google App Key is not defined."),
      });
      console.warn("Google App Key is not defined.");
      return;
    }
    const picker = document.createElement("drive-picker");
    picker.setAttribute("client-id", clientId);
    picker.setAttribute("app-id", appId);
    picker.setAttribute("developer-key", apiKey);
    picker.setAttribute("prompt", "consent");
    picker.setAttribute("multiselect", "false");
    const docsView = document.createElement("drive-picker-docs-view");
    docsView.setAttribute("select-multiple", "false");
    // docsView.setAttribute("starred", "true");
    docsView.setAttribute(
      "mime-types",
      "application/vnd.google-apps.document,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    picker.appendChild(docsView);

    // set the token when authenticated
    picker.addEventListener("picker:authenticated", ({ detail }) => {
      gapi.client.setToken({ access_token: detail.token });
    });
    picker.addEventListener("picker:picked", async (event) => {
      const { docs } = event.detail;
      const doc = docs?.at(0);
      if (!doc) {
        console.warn("No document selected");
        return;
      }
      if (!filesApi.current) {
        try {
          await gapi.client.load("drive", "v3");
          filesApi.current = true;
        } catch (error) {
          showError({
            type: "error",
            message: t("editor.gdoc.error.google_drive_api"),
            error,
          });
          console.error("Error loading Drive API:", error);
          return;
        }
      }
      if (
        !("drive" in gapi.client) ||
        gapi.client.drive === undefined ||
        !filesApi.current
      ) {
        console.error("gapi.client.drive is undefined");
        showError({
          type: "error",
          message: t("editor.gdoc.error.google_drive_api"),
          error: new ReferenceError("Google Drive API is not loaded"),
        });
        return;
      }
      setFilename(doc.name ?? null);
      if (
        doc.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        try {
          const res = await gapi.client.drive.files.get(
            { fileId: doc.id, alt: "media" },
            { responseType: "arraybuffer" }
          );
          const { value, messages } = await convertToHtml(
            { arrayBuffer: res.body as unknown as ArrayBuffer },
            { styleMap: "u => u" }
          );
          console.log("Converted content:", value, messages);
          if (messages.length) {
            showError(...messages);
            console.error(messages);
          }
          setText(value);
        } catch (err) {
          console.error("Error fetching or converting docx file:", err);
          showError({
            type: "error",
            message: t("editor.gdoc.error.docx"),
            error: err,
          });
        }
      } else if (doc.mimeType === "application/vnd.google-apps.document") {
        try {
          const res = await gapi.client.drive.files.export({
            fileId: doc.id,
            mimeType: "text/html",
          });
          // Extract html body content.
          if (!res.body) {
            showError({
              type: "error",
              message: t("editor.gdoc.error.gdoc_empty"),
              error: new Error("Empty response body"),
            });
            console.error("Empty response body when exporting Google Doc");
            return;
          }
          const parser = new DOMParser();
          const parsed = parser.parseFromString(res.body, "text/html");
          setText(parsed.body.innerHTML);
        } catch (err) {
          console.error("Error fetching or converting gdoc file:", err);
          showError({
            type: "error",
            message: t("editor.gdoc.error.gdoc"),
            error: err,
          });
        }
      } else {
        console.warn("Unsupported file type:", doc.mimeType);
        showError({
          type: "error",
          message: t("editor.gdoc.error.unknown_type", { type: doc.mimeType }),
          error: new TypeError(doc.mimeType),
        });
      }
      // } catch (err) {
      // console.error("Error exporting file:", err);
      // }
    });
    picker.addEventListener("picker:canceled", console.log);
    picker.addEventListener("picker:error", console.error);
    // ensure the element is registered before trying to use it, otherwise you'll get an error when trying to set properties on the custom element.
    document.body.appendChild(picker);

    picker.visible = true;
  };
  return (
    <PickerContext.Provider value={showPicker}>
      {children}
    </PickerContext.Provider>
  );
};
