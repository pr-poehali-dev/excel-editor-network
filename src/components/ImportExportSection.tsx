import { useState, useRef } from 'react';
import { TableFile } from '@/types';
import Icon from '@/components/ui/icon';

interface Props {
  tables: TableFile[];
}

export default function ImportExportSection({ tables }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; status: 'processing' | 'done' | 'error' }[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedExportTable, setSelectedExportTable] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'));
    arr.forEach(file => {
      const entry = { name: file.name, size: formatSize(file.size), status: 'processing' as const };
      setUploadedFiles(prev => [...prev, entry]);
      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done' } : f));
      }, 1500 + Math.random() * 1000);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
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
              <p className="text-sm text-gray-500 mt-0.5">Форматирование, стили и шрифты сохраняются полностью</p>
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
              <div className="text-sm text-gray-400 mb-4">или нажмите для выбора</div>
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
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <Icon name="FileSpreadsheet" size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-gray-400">{file.size}</div>
                    </div>
                    {file.status === 'processing' ? (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Обработка...
                      </div>
                    ) : file.status === 'done' ? (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Icon name="CheckCircle" size={14} />
                        Загружено
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
                { icon: 'Merge', title: 'Объединённые ячейки', desc: 'Все merge/unmerge сохраняются' },
                { icon: 'Sheet', title: 'Несколько листов', desc: 'Все вкладки книги импортируются' },
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
              <p className="text-sm text-gray-500 mt-0.5">Выгрузите данные с сохранением форматирования</p>
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

            {/* Export options */}
            {exportFormat === 'xlsx' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="text-xs font-medium text-gray-600 mb-3">Параметры Excel</div>
                {[
                  'Сохранить стили и форматирование',
                  'Включить все листы',
                  'Сохранить ширину столбцов',
                  'Экспортировать формулы',
                  'Сохранить условное форматирование',
                ].map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-green-600" />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            <button
              disabled={!selectedExportTable}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="Download" size={16} />
              Экспортировать{selectedExportTable && ` (${tables.find(t => t.id === selectedExportTable)?.name})`}
            </button>

            {/* Last exports */}
            <div className="mt-8">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Последние экспорты</div>
              <div className="space-y-2">
                {[
                  { name: 'Прайс-лист.xlsx', date: '2024-03-15 14:22', size: '142 КБ', fmt: 'xlsx' },
                  { name: 'Клиенты.csv', date: '2024-03-14 10:05', size: '89 КБ', fmt: 'csv' },
                  { name: 'Заказы.xlsx', date: '2024-03-13 16:30', size: '1.2 МБ', fmt: 'xlsx' },
                ].map((exp, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 group">
                    <Icon name="FileSpreadsheet" size={16} className="text-green-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{exp.name}</div>
                      <div className="text-xs text-gray-400">{exp.date} · {exp.size}</div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-all">
                      <Icon name="Download" size={12} />
                      Скачать
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
