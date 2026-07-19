export interface CsvColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
}

/** RFC 4180: quote any field containing a comma, quote, or newline; double up embedded quotes. */
function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const lines = [
    columns.map((c) => escapeCsvField(c.label)).join(","),
    ...rows.map((row) =>
      columns.map((c) => escapeCsvField(c.value(row))).join(","),
    ),
  ];
  const csv = lines.join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
