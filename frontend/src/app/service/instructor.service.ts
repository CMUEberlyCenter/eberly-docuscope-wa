import useSWR, { mutate } from 'swr';
import { ConfigurationInformation } from '../../lib/Configuration';
import { fetcher } from './fetcher';

export type FileInfo = {
  id: string;
  filename: string;
  date: string;
  info?: ConfigurationInformation;
};

export function useConfigurations() {
  const { data, error, isLoading } = useSWR(
    '/api/v1/configurations',
    fetcher<FileInfo[]>
  );
  return {
    files: data,
    error,
    isLoading,
  };
}

export function refreshConfigurations() {
  mutate('/api/v1/configurations');
}
