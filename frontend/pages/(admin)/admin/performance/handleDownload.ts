/**
 * Handle downloading data as a JSON file.
 * @param data stringified JSON data to download
 * @param fileName desired name of the downloaded file, should end with .json
 */
export const handleDownload = (data: string, fileName: string) => {
  const blob = new Blob([data], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.classList.add('d-none');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
