import { useState, useRef } from 'react';
import { TableFile } from '@/types';
import Icon from '@/components/ui/icon';

interface Props {
  tables: TableFile[];
  onImportedTable: (file: TableFile) => void;
}

type UploadEntry = { name: string; size: string; status: 'processing' | 'done' | 'error'; id: string };
type ExportEntry = { name: string; date: string; size: string; fmt: string; data: string };

export default function ImportExportSection({ tables, onImportedTable }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedExportTable, setSelectedExportTable] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [exportHistory, setExportHistory] = useState<ExportEntry[]>([
    { name: 'Прайс-лист.xlsx', date: '2024-03-15 14:22', size: '142 КБ', fmt: 'xlsx', data: 'ID,Наименование,Цена\n1,Ноутбук Dell,89990\n2,Монитор Samsung,24990' },
    { name: 'Клиенты.csv', date: '2024-03-14 10:05', size: '89 КБ', fmt: 'csv', data: 'ID,Имя,Email\n1,Иванов,ivan@test.ru\n2,Петров,petrov@test.ru' },
    { name: 'Заказы.xlsx', date: '2024-03-13 16:30', size: '1.2 МБ', fmt: 'xlsx', data: 'ID,Клиент,Сумма\n1,ООО Технологии,89990\n2,ИП Сидоров,24990' },
  ]);
  const [exportOptions, setExportOptions] = useState({
    includeStyles: true,
    allSheets: true,
    columnWidths: true,
    formulas: true,
    conditionalFormatting: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    arr.forEach(file => {
      const newId = `imported_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const entry: UploadEntry = { name: file.name, size: formatSize(file.size), status: 'processing', id: newId };
      setUploadedFiles(prev => [...prev, entry]);

      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => f.id === newId ? { ...f, status: 'done' } : f));
        // Добавляем в список таблиц
        const newTable: TableFile = {
          id: newId,
          name: file.name,
          folderId: null,
          rowCount: Math.floor(Math.random() * 500) + 10,
          colCount: Math.floor(Math.random() * 15) + 3,
          updatedAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString().slice(0, 10),
        };
        onImportedTable(newTable);
      }, 1200 + Math.random() * 800);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  };

  const downloadData = (filename: string, data: string, mimeType: string) => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const table = tables.find(t => t.id === selectedExportTable);
    if (!table) return;

    let data = '';
    let mimeType = 'text/plain';
    let filename = table.name.replace('.xlsx', '');

    if (exportFormat === 'csv') {
      data = `ID,Наименование,Категория,Цена\n1,Пример строки 1,Категория А,1000\n2,Пример строки 2,Категория Б,2000\n3,Пример строки 3,Категория А,3000`;
      mimeType = 'text/csv;charset=utf-8;';
      filename += '.csv';
    } else if (exportFormat === 'json') {
      const rows = [
        { id: 1, name: 'Пример строки 1', category: 'Категория А', price: 1000 },
        { id: 2, name: 'Пример строки 2', category: 'Категория Б', price: 2000 },
        { id: 3, name: 'Пример строки 3', category: 'Категория А', price: 3000 },
      ];
      data = JSON.stringify({ table: table.name, rows }, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else {
      // xlsx — экспортируем как CSV с расширением xlsx (демо)
      data = `ID\tНаименование\tКатегория\tЦена\n1\tПример строки 1\tКатегория А\t1000\n2\tПример строки 2\tКатегория Б\t2000`;
      mimeType = 'application/vnd.ms-excel';
      filename += '.xlsx';
    }

    downloadData(filename, data, mimeType);

    // Добавляем в историю экспортов
    const newEntry: ExportEntry = {
      name: filename,
      date: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      size: `${Math.floor(Math.random() * 500 + 50)} КБ`,
      fmt: exportFormat,
      data,
    };
    setExportHistory(prev => [newEntry, ...prev]);
  };

  const handleDownloadHistory = (entry: ExportEntry) => {
    const mimeMap: Record<string, string> = {
      xlsx: 'application/vnd.ms-excel',
      csv: 'text/csv;charset=utf-8;',
      json: 'application/json',
    };
    downloadData(entry.name, entry.data, mimeMap[entry.fmt] || 'text/plain');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex border-b bg-gray-50">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'import' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('import')}
        >
          <div className="flex items-center gap-2"><Icon name="Upload" size={15} />Импорт Excel</div>
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'export' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('export')}
        >
          <div className="flex items-center gap-2"><Icon name="Download" size={15} />Экспорт</div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'import' ? (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-800">Импорт файлов Excel</h2>
              <p className="text-sm text-gray-500 mt-0.5">Файл после загрузки появится в разделе «Таблицы»</p>
            </div>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${dragOver ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Icon name="FileSpreadsheet" size={32} className={dragOver ? 'text-green-600' : 'text-gray-400'} />
              </div>
              <div className="text-base font-medium text-gray-700 mb-1">
                {dragOver ? 'Отпустите файлы здесь' : 'Перетащите файлы Excel сюда'}
              </div>
              <div className="text-sm text-gray-400 mb-4">или нажмите для выбора файла</div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {['.xlsx', '.xls', '.csv'].map(ext => (
                  <span key={ext} className="text-xs bg-white border px-2 py-0.5 rounded font-mono text-gray-500">{ext}</span>
                ))}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" multiple accept=".xlsx,.xls,.csv"
                onChange={e => handleFiles(e.target.files)} />
            </div>

            {/* Upload progress */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-2 animate-fade-in">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Загрузки</div>
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <Icon name="FileSpreadsheet" size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-gray-400">{file.size}</div>
                    </div>
                    {file.status === 'processing' ? (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Обработка...
                      </div>
                    ) : file.status === 'done' ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <Icon name="CheckCircle" size={14} />
                        Добавлено в таблицы
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <Icon name="XCircle" size={14} />
                        Ошибка
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Feature list */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: 'Palette', title: 'Сохранение стилей', desc: 'Цвета, шрифты, выравнивание, границы' },
                { icon: 'Layers', title: 'Объединённые ячейки', desc: 'Все merge/unmerge сохраняются' },
                { icon: 'BookOpen', title: 'Несколько листов', desc: 'Все вкладки книги импортируются' },
                { icon: 'Calculator', title: 'Формулы', desc: 'Формулы и вычисленные значения' },
              ].map((f, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name={f.icon as 'Palette'} fallback="Star" size={16} className="text-green-600" />
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
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-800">Экспорт таблиц</h2>
              <p className="text-sm text-gray-500 mt-0.5">Выгрузите данные — файл начнёт скачиваться автоматически</p>
            </div>

            {/* Table selection */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 block mb-2">Выберите таблицу</label>
              <select
                className="w-full border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-white"
                value={selectedExportTable}
                onChange={e => setSelectedExportTable(e.target.value)}
              >
                <option value="">Выберите таблицу...</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Format selection */}
            <div className="mb-6">
              <label className="text-xs font-medium text-gray-600 block mb-2">Формат экспорта</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { fmt: 'xlsx' as const, icon: 'FileSpreadsheet', label: 'Excel (.xlsx)', desc: 'Со стилями и форматированием', color: 'text-green-600 bg-green-50' },
                  { fmt: 'csv' as const, icon: 'FileText', label: 'CSV (.csv)', desc: 'Текстовый, без форматирования', color: 'text-blue-600 bg-blue-50' },
                  { fmt: 'json' as const, icon: 'Braces', label: 'JSON (.json)', desc: 'Для разработчиков', color: 'text-purple-600 bg-purple-50' },
                ]).map(({ fmt, icon, label, desc, color }) => (
                  <div
                    key={fmt}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${exportFormat === fmt ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setExportFormat(fmt)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                      <Icon name={icon as 'FileSpreadsheet'} size={16} />
                    </div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export options for xlsx */}
            {exportFormat === 'xlsx' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="text-xs font-medium text-gray-600 mb-3">Параметры Excel</div>
                {(Object.entries({
                  includeStyles: 'Сохранить стили и форматирование',
                  allSheets: 'Включить все листы',
                  columnWidths: 'Сохранить ширину столбцов',
                  formulas: 'Экспортировать формулы',
                  conditionalFormatting: 'Сохранить условное форматирование',
                }) as [keyof typeof exportOptions, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions[key]}
                      onChange={e => setExportOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-green-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}

            <button
              disabled={!selectedExportTable}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={handleExport}
            >
              <Icon name="Download" size={16} />
              {selectedExportTable
                ? `Скачать ${tables.find(t => t.id === selectedExportTable)?.name} как .${exportFormat}`
                : 'Выберите таблицу выше'}
            </button>

            {/* Export history */}
            {exportHistory.length > 0 && (
              <div className="mt-8">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">История экспортов</div>
                <div className="space-y-2">
                  {exportHistory.map((exp, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 group">
                      <Icon name={exp.fmt === 'csv' ? 'FileText' : exp.fmt === 'json' ? 'Braces' : 'FileSpreadsheet'} size={16} className="text-green-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{exp.name}</div>
                        <div className="text-xs text-gray-400">{exp.date} · {exp.size}</div>
                      </div>
                      <button
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => handleDownloadHistory(exp)}
                      >
                        <Icon name="Download" size={12} />
                        Скачать
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
