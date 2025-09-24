import { createContext, useContext, useState, type FC, type ReactNode } from "react";

/**
 * Context for the file text.
 * This is used to store the html translation of the uploaded file.
 */
const FileTextContext = createContext<[string | null, React.Dispatch<React.SetStateAction<string | null>>]>([null, () => {}]);
/**
 * Hook for accessing the html translation of the uploaded file.
 */
export const useFileText = () => useContext(FileTextContext);

export const FileTextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [text, setText] = useState<string | null>(null);

  return <FileTextContext.Provider value={[text, setText]}>
    {children}
  </FileTextContext.Provider>;
}
