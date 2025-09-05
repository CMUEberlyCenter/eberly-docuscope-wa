// import "@googleworkspace/drive-picker-element";
// import type { DrivePickerElement } from "@googleworkspace/drive-picker-element";
import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';

// type PickerCallback = (doc?: google.picker.DocumentObject) => void;
// TODO file data
const PickerContext = createContext<(show: boolean) => void>(
  () => { }
);
export const usePicker = () => useContext(PickerContext);

export const PickerProvider: FC<{ children: ReactNode, clientId?: string, apiKey?: string, appId?: string }> = ({ children, clientId, apiKey, appId }) => {
  // const [showPicker, setShowPicker] = useState(false);
  const [pickerApiInitialized, setPickerApiInitialized] = useState(false);
  const [gisInitialized, setGisInitialized] = useState(false);
  const [tokenClient, setTokenClient] =
    useState<google.accounts.oauth2.TokenClient | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Load Google APIs
    const onloadPickerApi = () =>
      gapi.load("client:picker", async () => {
        await gapi.client.load(
          "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
        );
        setPickerApiInitialized(true);
        console.log("Picker API loaded.");
      });
    const gapiScriptTag = document.createElement("script");
    gapiScriptTag.src = "https://apis.google.com/js/api.js";
    gapiScriptTag.async = true;
    gapiScriptTag.defer = true;
    gapiScriptTag.addEventListener("load", onloadPickerApi);
    document.body.appendChild(gapiScriptTag);

    // Load Google Identity Services
    const onloadGisApi = () => {
      setGisInitialized(true);
      // setTokenClient(google.accounts.oauth2.initTokenClient({
      //   client_id: clientId ?? '',
      //   scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
      //   callback: () => { console.log("Google Identity Services callback"); }, // defined later
      // }));
      setTokenClient(google.accounts.oauth2.initTokenClient({
          client_id: clientId ??'',
          scope: "https://www.googleapis.com/auth/drive.file",
          error_callback: (error) => {
            if (error.type === "popup_closed") {
              console.warn('Popup closed', error);
              return;
            }
            console.error("Error in token client:", error);
            throw new Error(error.message);
          },
          callback: (tokenResponse) => {
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
            console.log(window.location.protocol + '//' + window.location.host);
            const picker = new google.picker.PickerBuilder()
              // .enableFeature(google.picker.Feature.NAV_HIDDEN)
              .setDeveloperKey(apiKey??'')
              .setAppId(appId??'')
              .setOAuthToken(token)
              .addView(new google.picker.DocsView())
              .setOrigin(window.location.protocol + '//' + window.location.host)
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
                  // callback?.(doc.result);
                }
              })
              .build();
            picker.setVisible(true);
          },
        }));
      console.log("Google Identity Services initialized.");
    };
    const gisScriptTag = document.createElement("script");
    gisScriptTag.src = "https://accounts.google.com/gsi/client";
    gisScriptTag.async = true;
    gisScriptTag.defer = true;
    gisScriptTag.addEventListener("load", onloadGisApi);
    // TODO add error listener
    document.body.appendChild(gisScriptTag);

    return () => {
      // Clean up script tags
      gapiScriptTag.removeEventListener("load", onloadPickerApi);
      document.body.removeChild(gapiScriptTag);
      gisScriptTag.removeEventListener("load", onloadGisApi);
      document.body.removeChild(gisScriptTag);
    };
  }, []);

  const showPicker = () => {
      console.log("Opening Google Picker...");
      if (!pickerApiInitialized || !gisInitialized) {
        console.warn("Google APIs not initialized yet.");
        return;
      }
      if (!clientId) {
        console.warn("Google Client ID is not defined.");
        return;
      }
      if (!apiKey) {
        console.warn("Google API Key is not defined.");
        return;
      }
      if (!appId) {
        console.warn("Google App Key is not defined.");
        return;
      }
      console.log("Google APIs initialized, proceeding...");
      // const client =
      //   tokenClient ||
      //   google.accounts.oauth2.initTokenClient({
      //     client_id: clientId,
      //     scope: "https://www.googleapis.com/auth/drive.file",
      //     error_callback: (error) => {
      //       if (error.type === "popup_closed") {
      //         console.warn('Popup closed', error);
      //         return;
      //       }
      //       console.error("Error in token client:", error);
      //       throw new Error(error.message);
      //     },
      //     callback: (tokenResponse) => {
      //       console.log("Token response received:", tokenResponse);
      //       if (tokenResponse.error) {
      //         console.error(
      //           "Error obtaining access token:",
      //           tokenResponse.error
      //         );
      //         throw new Error(tokenResponse.error);
      //       }
      //       const token = tokenResponse.access_token;
      //       console.log("Access token received:", token);
      //       setAccessToken(token);
      //       console.log(window.location.protocol + '//' + window.location.host);
      //       const picker = new google.picker.PickerBuilder()
      //         // .enableFeature(google.picker.Feature.NAV_HIDDEN)
      //         .setDeveloperKey(apiKey)
      //         .setAppId(appId)
      //         .setOAuthToken(token)
      //         .addView(new google.picker.DocsView())
      //         .setOrigin(window.location.protocol + '//' + window.location.host)
      //         // .addView(new google.picker.DocsUploadView())
      //         .setCallback(async (data) => {
      //           console.log("Picker callback data:", data);
      //           if (
      //             data[google.picker.Response.ACTION] ===
      //             google.picker.Action.PICKED
      //           ) {
      //             const document =
      //               data[google.picker.Response.DOCUMENTS]?.at(0);
      //             const fileId = document?.[google.picker.Document.ID];
      //             console.log("Selected document:", fileId);
      //             if (!fileId) {
      //               console.error("No file ID found in the selected document.");
      //               return;
      //             }
      //             const doc = await gapi.client.drive.files.get({
      //               fileId,
      //               fields: "*", // "id, name, mimeType, webContentLink, webViewLink"
      //             });
      //             console.log("Document details:", doc);
      //             // Handle the selected document
      //             // callback?.(doc.result);
      //           }
      //         })
      //         .build();
      //       picker.setVisible(true);
      //     },
      //   });
      // setTokenClient(client);
      // console.log('accessToken', accessToken);
      // client.requestAccessToken({ prompt: accessToken ? "" : "consent" });
      if (!tokenClient) console.log("Token client not initialized.");
      tokenClient?.requestAccessToken({ prompt: "" });
  };
  return <PickerContext.Provider value={showPicker}>
    {children}
  </PickerContext.Provider>;
};
