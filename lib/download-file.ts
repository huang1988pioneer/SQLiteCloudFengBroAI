type DownloadTextFileOptions = {
  content: string;
  filename: string;
  mimeType?: string;
};

export function downloadTextFile({
  content,
  filename,
  mimeType = "text/plain;charset=utf-8",
}: DownloadTextFileOptions) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsvFile(filename: string, csv: string) {
  downloadTextFile({
    content: csv,
    filename,
    mimeType: "text/csv;charset=utf-8",
  });
}
