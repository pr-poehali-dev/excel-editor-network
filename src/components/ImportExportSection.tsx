import { useState, useRef } from 'react';
import { TableFile, TableData } from '@/types';
import Icon from '@/components/ui/icon';
import * as XLSX from 'xlsx';
import {
  exportTableDataToXLSX,
  exportToCSV,
  exportToJSON,
  importFromExcelFile,
  tableDataToRows,
  printTable,
} from '@/lib/excel';

interface Props {
  tables: TableFile[];
  tableDataMap: Record<string, TableData>;
  onImportedTable: (file: TableFile, data: TableData) => void;
}

type UploadEntry = {
  id: string;
  name: string;
  size: string;
  status: 'processing' | 'done' | 'error';
  error?: string;
};

type ExportHistoryEntry = {
  id: string;
  name: string;
  date: string;
  fmt: string;
  tableId: string;
};

export default function ImportExportSection({ tables, tableDataMap, onImportedTable }: Props) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);

  const [selectedTableId, setSelectedTableId] = useState('');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);

  const [exportOptions, setExportOptions] = useState({
    allSheets: true,
    includeHeaders: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter(f => /\.(xlsx?|csv)$/i.test(f.name));
    if (!accepted.length) return;

    for (const file of accepted) {
      const entryId = `up_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setUploads(prev => [...prev, { id: entryId, name: file.name, size: fmtSize(file.size), status: 'processing' }]);
      try {
        const result = await importFromExcelFile(file);
        setUploads(prev => prev.map(u => u.id === entryId ? { ...u, status: 'done' } : u));
        onImportedTable(result.tableFile, result.tableData);
      } catch (err) {
        setUploads(prev => prev.map(u => u.id === entryId ? { ...u, status: 'error', error: String(err) } : u));
      }
    }
  };

  const handleExport = () => {
    const tableFile = tables.find(t => t.id === selectedTableId);
    if (!tableFile) return;
    setExporting(true);
    setTimeout(() => {
      try {
        const baseName = tableFile.name.replace(/\.(xlsx?|csv)$/i, '');
        const tableData = tableDataMap[selectedTableId];

        if (exportFormat === 'xlsx') {
          if (tableData) {
            exportTableDataToXLSX(tableData, baseName);
          } else {
            const ws = XLSX.utils.json_to_sheet([
              { 'Таблица': tableFile.name, 'Строк': tableFile.rowCount, 'Столбцов': tableFile.colCount, 'Обновлено': tableFile.updatedAt }
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Данные');
            XLSX.writeFile(wb, baseName + '.xlsx');
          }
        } else if (exportFormat === 'csv') {
          if (tableData) {
            const { headers, rows } = tableDataToRows(tableData);
            exportToCSV(headers, rows, baseName);
          } else {
            exportToCSV(
              ['Таблица', 'Строк', 'Столбцов', 'Обновлено'],
              [[tableFile.name, tableFile.rowCount, tableFile.colCount, tableFile.updatedAt]],
              baseName
            );
          }
        } else {
          exportToJSON(
            tableData
              ? { name: tableFile.name, sheets: tableData.sheets.map(s => s.name), columns: tableData.columns.map(c => c.name) }
              : { name: tableFile.name, rowCount: tableFile.rowCount, colCount: tableFile.colCount },
            baseName
          );
        }

        setHistory(prev => [{
          id: `h_${Date.now()}`,
          name: baseName + '.' + exportFormat,
          date: new Date().toLocaleString('ru-RU'),
          fmt: exportFormat,
          tableId: selectedTableId,
        }, ...prev.slice(0, 19)]);
      } finally {
        setExporting(false);
      }
    }, 50);
  };

  const handlePrint = () => {
    const tableFile = tables.find(t => t.id === selectedTableId);
    if (!tableFile) return;
    const tableData = tableDataMap[selectedTableId];
    if (tableData) {
      const { headers, rows } = tableDataToRows(tableData);
      printTable(tableFile.name.replace(/\.(xlsx?|csv)$/i, ''), headers, rows, 'landscape');
    } else {
      printTable(tableFile.name, ['Таблица', 'Строк', 'Столбцов', 'Обновлено'],
        [[tableFile.name, tableFile.rowCount, tableFile.colCount, tableFile.updatedAt]], 'portrait');
    }
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1048576).toFixed(1)} МБ`;
  };

  const fmtIcon = (fmt: string): 'FileSpreadsheet' | 'FileText' | 'Braces' =>
    fmt === 'csv' ? 'FileText' : fmt === 'json' ? 'Braces' : 'FileSpreadsheet';

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex border-b bg-gray-50 flex-shrink-0">
        {(['import', 'export'] as const).map(tab => (
          <button
            key={tab}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
            onClick={() => setActiveTab(tab)}
          >
            <Icon name={tab === 'import' ? 'Upload' : 'Download'} size={15} />
            {tab === 'import' ? 'Импорт Excel' : 'Экспорт'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'import' ? (
          <div className="max-w-2xl">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-800">Импорт файлов Excel</h2>
              <p className="text-sm text-gray-500 mt-0.5">После загрузки файл появится в разделе «Таблицы» с реальными данными</p>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none ${dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-colors ${dragOver ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Icon name="FileSpreadsheet" size={28} className={dragOver ? 'text-green-600' : 'text-gray-400'} />
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                {dragOver ? 'Отпустите файл' : 'Перетащите файл сюда или нажмите'}
              </div>
              <div className="flex justify-center gap-2 mt-3">
                {['.xlsx', '.xls', '.csv'].map(e => (
                  <span key={e} className="text-xs bg-white border px-2 py-0.5 rounded font-mono text-gray-500">{e}</span>
                ))}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" multiple accept=".xlsx,.xls,.csv"
                onChange={ev => processFiles(ev.target.files)} />
            </div>

            {uploads.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Загрузки</div>
                {uploads.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="FileSpreadsheet" size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-xs text-gray-400">{u.size}</div>
                    </div>
                    {u.status === 'processing' && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Обработка...
                      </div>
                    )}
                    {u.status === 'done' && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <Icon name="CheckCircle2" size={14} />Добавлено в таблицы
                      </div>
                    )}
                    {u.status === 'error' && (
                      <div className="flex items-center gap-1.5 text-xs text-red-500" title={u.error}>
                        <Icon name="XCircle" size={14} />Ошибка чтения
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: 'BookOpen', title: 'Несколько листов', desc: 'Все вкладки книги Excel' },
                { icon: 'Calculator', title: 'Значения ячеек', desc: 'Числа, текст, даты' },
                { icon: 'Table2', title: 'Определение типов', desc: 'Число / Дата / Текст авто' },
                { icon: 'Database', title: 'Готово к связям', desc: 'Настройте ключи в «Связях»' },
              ].map((f, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name={f.icon as 'Table2'} fallback="Star" size={16} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{f.title}</div>
                    <div className="text-xs text-gray-500">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-800">Экспорт таблиц</h2>
              <p className="text-sm text-gray-500 mt-0.5">XLSX открывается в Excel без ошибок · CSV с BOM для кириллицы</p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Таблица</label>
              <select
                className="w-full border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-white"
                value={selectedTableId}
                onChange={e => setSelectedTableId(e.target.value)}
              >
                <option value="">Выберите таблицу...</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {t.rowCount.toLocaleString()} строк</option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Формат</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { fmt: 'xlsx' as const, icon: 'FileSpreadsheet' as const, label: 'Excel (.xlsx)', desc: 'Microsoft Excel / LibreOffice', color: 'text-green-700 bg-green-50 border-green-200' },
                  { fmt: 'csv' as const, icon: 'FileText' as const, label: 'CSV (.csv)', desc: 'UTF-8 BOM, кириллица', color: 'text-blue-700 bg-blue-50 border-blue-200' },
                  { fmt: 'json' as const, icon: 'Braces' as const, label: 'JSON (.json)', desc: 'Для API / разработчиков', color: 'text-purple-700 bg-purple-50 border-purple-200' },
                ]).map(({ fmt, icon, label, desc, color }) => (
                  <div
                    key={fmt}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${exportFormat === fmt ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                    onClick={() => setExportFormat(fmt)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 border ${color}`}>
                      <Icon name={icon} size={16} />
                    </div>
                    <div className="text-sm font-medium leading-tight">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {exportFormat === 'xlsx' && (
              <div className="mb-5 p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Параметры</div>
                {([
                  ['allSheets', 'Включить все листы книги'],
                  ['includeHeaders', 'Строка заголовков'],
                ] as [keyof typeof exportOptions, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={exportOptions[key]}
                      onChange={e => setExportOptions(p => ({ ...p, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-green-600" />
                    {label}
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                disabled={!selectedTableId || exporting}
                onClick={handleExport}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {exporting
                  ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Экспортируем...</>
                  : <><Icon name="Download" size={15} />Скачать .{exportFormat}</>}
              </button>
              <button
                disabled={!selectedTableId}
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 border text-sm rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="Printer" size={15} />Печать
              </button>
              {selectedTableId && (
                <span className="text-xs text-gray-400">
                  {tables.find(t => t.id === selectedTableId)?.rowCount.toLocaleString()} строк
                </span>
              )}
            </div>

            {history.length > 0 && (
              <div className="mt-8">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">История экспортов</div>
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 group transition-colors">
                      <Icon name={fmtIcon(h.fmt)} size={16} className="text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{h.name}</div>
                        <div className="text-xs text-gray-400">{h.date}</div>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-all"
                        onClick={() => {
                          setSelectedTableId(h.tableId);
                          setExportFormat(h.fmt as 'xlsx' | 'csv' | 'json');
                          setTimeout(handleExport, 150);
                        }}
                      >
                        <Icon name="RotateCcw" size={12} />Повторить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
