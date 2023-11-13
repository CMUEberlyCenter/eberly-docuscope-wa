import useSWR, { mutate } from "swr";

export interface FileInfo {
  id: string;
  filename: string;
  date: string;
  info?: {
    name?: string;
    version?: string;
    author?: string;
    copyright?: string;
    saved?: string;
  };
}

const fetcher = (input: RequestInfo | URL, init?: RequestInit|undefined) => fetch(input, {
  headers: {
    Accept: 'application/json'
  }, ...init}).then(res => {
    if (!res.ok) {
      console.error(`Server error ${res.status} - ${res.statusText}`);
      throw new Error(res.statusText);
    }
    return res.json();
  });

export function useConfigurations() {
  const {data, error, isLoading} = useSWR('/api/v1/configurations', fetcher);
  return {
    files: data as FileInfo[],
    error, isLoading
  }
}

export function refreshConfigurations() {
  mutate('/api/v1/configurations');
}
