import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type FC,
  type ReactNode,
  type SetStateAction,
} from "react";

/** Context for storing the uploaded filename. */
const FilenameContext = createContext<
  [string | null, Dispatch<SetStateAction<string | null>>]
>([null, () => {}]);
/** Hook for accessing the uploaded filename. */ // used for exporting with the same name
export const useFilename = () => useContext(FilenameContext);
/**
 * Context for the file text.
 * This is used to store the html translation of the uploaded file.
 */
const FileTextContext = createContext<
  [string | null, Dispatch<SetStateAction<string | null>>]
>([null, () => {}]);
/**
 * Hook for accessing the html translation of the uploaded file.
 */
export const useFileText = () => useContext(FileTextContext);

export const FileTextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [text, setText] = useState<string | null>(null);
  const [file, setFile] = useState<string | null>(null);

  return (
    <FileTextContext.Provider value={[text, setText]}>
      <FilenameContext.Provider value={[file, setFile]}>
        {children}
      </FilenameContext.Provider>
    </FileTextContext.Provider>
  );
};
