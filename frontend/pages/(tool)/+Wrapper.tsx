import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useData } from "vike-react/useData";
import { PickerContext } from "../../src/app/components/FileUpload/PickerContext";
import {
  useSetWritingTask,
  WritingTaskProvider,
} from "../../src/app/components/WritingTaskContext/WritingTaskContext";
import type { Data } from "./+data";
import { usePageContext } from "vike-react/usePageContext";

const DataWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const data = useData<Data>();
  const setTask = useSetWritingTask();
  useEffect(() => setTask(data), [data, setTask]);
  return <>{children}</>;
};

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const [pickerApiInitialized, setPickerApiInitialized] = useState(false);
  const [gisInitialized, setGisInitialized] = useState(false);
  const [tokenClient, setTokenClient] =
    useState<google.accounts.oauth2.TokenClient | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  // const [showPicker, setShowPicker] = useState(false);
  const pageContext = usePageContext();

  const openPicker = useCallback(
    (callback: (doc?: google.picker.DocumentObject) => void) => {
      console.log("Opening Google Picker...");
      if (!pickerApiInitialized || !gisInitialized) {
        console.warn("Google APIs not initialized yet.");
        return;
      }
      console.log(tokenClient, pageContext.google?.clientId);
      if (!pageContext.google?.clientId) {
        console.warn("Google Client ID is not defined.");
        return;
      }
      if (!pageContext.google?.apiKey) {
        console.warn("Google API Key is not defined.");
        return;
      }
      if (!pageContext.google?.appKey) {
        console.warn("Google App Key is not defined.");
        return;
      }
      const client =
        tokenClient ||
        google.accounts.oauth2.initTokenClient({
          client_id: pageContext.google?.clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          error_callback: (error) => {
            console.error("Error in token client:", error);
            throw new Error(error.message);
          },
          callback: async (tokenResponse) => {
            console.log("Token response received:", tokenResponse);
            if (tokenResponse.error) {
              console.error(
                "Error obtaining access token:",
                tokenResponse.error
              );
              throw new Error(tokenResponse.error);
            }
            const token = tokenResponse.access_token;
            console.log("Access token received:", token);
            setAccessToken(token);
            const picker = new google.picker.PickerBuilder()
              // .enableFeature(google.picker.Feature.NAV_HIDDEN)
              .setDeveloperKey(pageContext.google?.apiKey ?? '')
              .setAppId(pageContext.google?.appKey ?? '')
              .setOAuthToken(token)
              .addView(new google.picker.DocsView())
              // .addView(new google.picker.DocsUploadView())
              .setCallback(async (data) => {
                console.log("Picker callback data:", data);
                if (
                  data[google.picker.Response.ACTION] ===
                  google.picker.Action.PICKED
                ) {
                  const document =
                    data[google.picker.Response.DOCUMENTS]?.at(0);
                  const fileId = document?.[google.picker.Document.ID];
                  console.log("Selected document:", fileId);
                  if (!fileId) {
                    console.error("No file ID found in the selected document.");
                    return;
                  }
                  const doc = await gapi.client.drive.files.get({
                    fileId,
                    fields: "*", // "id, name, mimeType, webContentLink, webViewLink"
                  });
                  console.log("Document details:", doc);
                  // Handle the selected document
                  callback?.(doc.result);
                }
              })
              .build();
            picker.setVisible(true);
          },
        });
      if (client !== tokenClient) setTokenClient(client);
      console.log(accessToken);
      client.requestAccessToken({ prompt: accessToken ? "" : "consent" });
    },
    [accessToken, gisInitialized, pickerApiInitialized, tokenClient]
  );

  useEffect(() => {
    const onloadPickerApi = () =>
      gapi.load("client:picker", async () => {
        await gapi.client.load(
          "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
        );
        setPickerApiInitialized(true);
        console.log("Picker API loaded.");
      });
    // Load Google APIs
    const gapiScriptTag = document.createElement("script");
    gapiScriptTag.src = "https://apis.google.com/js/api.js";
    gapiScriptTag.async = true;
    gapiScriptTag.defer = true;
    gapiScriptTag.addEventListener("load", onloadPickerApi);
    document.body.appendChild(gapiScriptTag);

    const onloadGisApi = () => {
      setGisInitialized(true);
      console.log("Google Identity Services initialized.");
    };
    // Load Google Identity Services
    const gisScriptTag = document.createElement("script");
    gisScriptTag.src = "https://accounts.google.com/gsi/client";
    gisScriptTag.async = true;
    gisScriptTag.defer = true;
    gisScriptTag.addEventListener("load", onloadGisApi);
    document.body.appendChild(gisScriptTag);

    return () => {
      // Not sure this is necessary, but let's clean up.
      // if (accessToken) {
      //   google.accounts.oauth2.revoke(accessToken, () => {
      //     setAccessToken(undefined);
      //     console.log("Access token revoked.");
      //   });
      // }
      // Clean up script tags
      gapiScriptTag.removeEventListener("load", onloadPickerApi);
      document.body.removeChild(gapiScriptTag);
      gisScriptTag.removeEventListener("load", onloadGisApi);
      document.body.removeChild(gisScriptTag);
    };
  }, []);
  return (
    <PickerContext.Provider value={openPicker}>
      <WritingTaskProvider>
        <DataWrapper>{children}</DataWrapper>
      </WritingTaskProvider>
    </PickerContext.Provider>
  );
};
export default Wrapper;
