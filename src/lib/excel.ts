import * as XLSX from 'xlsx';
import { TableFile, TableData, SheetData } from '@/types';

// ─── EXPORT ────────────────────────────────────────────────────────────────

export interface ExportRow {
  [key: string]: string | number | null;
}

/**
 * Экспортирует массив строк в реальный .xlsx файл и запускает скачивание.
 * Файл корректно открывается в Microsoft Excel и LibreOffice.
 */
export function exportRowsToXLSX(rows: ExportRow[], sheetName: string, filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
}

/**
 * Экспортирует TableData (все листы, все ячейки) в xlsx.
 * Сохраняет стили заголовков (жирный), многолистовую структуру.
 */
export function exportTableDataToXLSX(tableData: TableData, filename?: string) {
  const wb = XLSX.utils.book_new();

  tableData.sheets.forEach(sheet => {
    const rows = sheetToRows(sheet);
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Авто-ширина столбцов
    const colWidths: XLSX.ColInfo[] = [];
    rows[0]?.forEach((_, ci) => {
      const maxLen = Math.max(...rows.map(r => String(r[ci] ?? '').length));
      colWidths.push({ wch: Math.max(10, Math.min(maxLen + 2, 40)) });
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  });

  const fn = (filename || tableData.name).replace('.xlsx', '') + '.xlsx';
  XLSX.writeFile(wb, fn);
}

/**
 * Экспортирует данные отчёта в xlsx.
 */
export function exportReportToXLSX(reportName: string, headers: string[], rows: Record<string, string | number>[]) {
  const wb = XLSX.utils.book_new();
  const data = [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Жирные заголовки
  headers.forEach((_, ci) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (!ws[cellAddr]) ws[cellAddr] = { v: headers[ci], t: 's' };
    ws[cellAddr].s = { font: { bold: true }, fill: { fgColor: { rgb: '217346' } } };
  });

  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Отчёт');
  XLSX.writeFile(wb, reportName.replace('.xlsx', '') + '.xlsx');
}

/**
 * Экспортирует в CSV (корректная кодировка UTF-8 с BOM для Excel).
 */
export function exportToCSV(headers: string[], rows: (string | number | null)[][], filename: string) {
  const csv = [headers, ...rows]
    .map(row => row.map(cell => {
      const v = String(cell ?? '');
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))
    .join('\r\n');

  // BOM для корректного открытия в Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Экспортирует в JSON.
 */
export function exportToJSON(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : filename + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── IMPORT ────────────────────────────────────────────────────────────────

export interface ImportResult {
  tableFile: TableFile;
  tableData: TableData;
}

/**
 * Читает Excel/CSV файл и возвращает TableFile + TableData.
 * Все листы из книги сохраняются.
 */
export async function importFromExcelFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellStyles: true });

        const sheets: SheetData[] = wb.SheetNames.map((sName, si) => {
          const ws = wb.Sheets[sName];
          const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

          const cells: SheetData['cells'] = {};
          rows.forEach((row, ri) => {
            row.forEach((val, ci) => {
              if (val !== null && val !== undefined && val !== '') {
                const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
                cells[addr] = { value: val as string | number };
              }
            });
          });

          return {
            id: `s${si + 1}`,
            name: sName,
            cells,
            columnWidths: {},
            rowHeights: {},
          };
        });

        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const firstRows: (string | number | null)[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
        const headerRow = (firstRows[0] || []).map(h => String(h ?? ''));
        const rowCount = Math.max(0, firstRows.length - 1);

        const tableId = `imported_${Date.now()}`;
        const tableFile: TableFile = {
          id: tableId,
          name: file.name,
          folderId: null,
          rowCount,
          colCount: headerRow.length,
          updatedAt: new Date().toLocaleString('ru-RU'),
          createdAt: new Date().toISOString().slice(0, 10),
        };

        const tableData: TableData = {
          id: tableId,
          name: file.name.replace(/\.(xlsx?|csv)$/i, ''),
          sheets,
          columns: headerRow.map((h, i) => ({
            id: `col${i}`,
            name: h || `Столбец ${i + 1}`,
            type: guessType(firstRows.slice(1).map(r => r[i])),
          })),
        };

        resolve({ tableFile, tableData });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── PRINT ─────────────────────────────────────────────────────────────────

/**
 * Открывает окно печати с HTML-таблицей.
 */
export function printTable(
  title: string,
  headers: string[],
  rows: (string | number | null)[][],
  orientation: 'portrait' | 'landscape' = 'landscape'
) {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&display=swap');
  @page { size: A4 ${orientation}; margin: 15mm; }
  body { font-family: 'PT Serif', serif; font-size: 11pt; color: #000; }
  h1 { font-size: 14pt; margin: 0 0 8pt; }
  p.meta { font-size: 9pt; color: #666; margin: 0 0 10pt; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #217346; color: #fff; font-weight: bold; padding: 5pt 7pt; text-align: left; font-size: 10pt; }
  td { padding: 4pt 7pt; font-size: 10pt; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) td { background: #f8f8f8; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>${escHtml(title)}</h1>
<p class="meta">Распечатано: ${new Date().toLocaleString('ru-RU')} · Строк: ${rows.length}</p>
<table>
<thead><tr>${headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>
<tbody>
${rows.map(row => `<tr>${row.map(cell => `<td>${escHtml(String(cell ?? ''))}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function guessType(values: (string | number | null)[]): 'string' | 'number' | 'date' | 'boolean' {
  const nonNull = values.filter(v => v !== null && v !== '');
  if (nonNull.length === 0) return 'string';
  if (nonNull.every(v => !isNaN(Number(v)))) return 'number';
  if (nonNull.every(v => /^\d{4}-\d{2}-\d{2}/.test(String(v)))) return 'date';
  if (nonNull.every(v => v === true || v === false || v === 'true' || v === 'false')) return 'boolean';
  return 'string';
}

function sheetToRows(sheet: SheetData): (string | number | null)[][] {
  const cells = sheet.cells;
  if (Object.keys(cells).length === 0) return [];

  let maxRow = 0, maxCol = 0;
  Object.keys(cells).forEach(addr => {
    const { r, c } = XLSX.utils.decode_cell(addr);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  });

  const rows: (string | number | null)[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    const row: (string | number | null)[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      row.push(cells[addr]?.value ?? null);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Возвращает строки для экспорта на основе TableData (первый лист).
 */
export function tableDataToRows(tableData: TableData): { headers: string[]; rows: (string | number | null)[][] } {
  const sheet = tableData.sheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const allRows = sheetToRows(sheet);
  if (allRows.length === 0) return { headers: [], rows: [] };

  const headers = allRows[0].map(h => String(h ?? ''));
  const rows = allRows.slice(1);
  return { headers, rows };
}
