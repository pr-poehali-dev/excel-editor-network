import { useState } from 'react';
import { Report, ReportColumn, ReportFilter, TableFile, Relation } from '@/types';
import Icon from '@/components/ui/icon';

interface Props {
  reports: Report[];
  tables: TableFile[];
  relations: Relation[];
  onReportsChange: (r: Report[]) => void;
}

const mockColumns: Record<string, string[]> = {
  't1': ['ID', 'Артикул', 'Наименование', 'Категория', 'Цена', 'Цена со скидкой', 'Ед.изм.', 'Наличие'],
  't2': ['ID', 'Имя клиента', 'Email', 'Телефон', 'Город', 'Сегмент', 'Дата регистрации'],
  't3': ['ID заказа', 'ID клиента', 'ID продукта', 'Дата заказа', 'Количество', 'Сумма', 'Статус'],
  't4': ['Период', 'Доходы', 'Расходы', 'Прибыль', 'Бюджет', 'Факт', 'Отклонение'],
  't5': ['ID продукта', 'Артикул', 'Количество', 'Ячейка', 'Дата прихода', 'Дата выдачи'],
  't6': ['ID', 'ФИО', 'Должность', 'Отдел', 'Email', 'Телефон', 'Дата найма', 'Зарплата'],
};

const sampleReportData = [
  { '№ Заказа': 'ORD-5621', 'Клиент': 'ООО Технологии', 'Продукт': 'Ноутбук Dell', 'Сумма': '89 990 ₽', 'Дата': '2024-03-15', 'Статус': 'Доставлен' },
  { '№ Заказа': 'ORD-5620', 'Клиент': 'ИП Сидоров', 'Продукт': 'Монитор Samsung', 'Сумма': '24 990 ₽', 'Дата': '2024-03-14', 'Статус': 'В пути' },
  { '№ Заказа': 'ORD-5619', 'Клиент': 'АО Прогресс', 'Продукт': 'Наушники Sony', 'Сумма': '29 990 ₽', 'Дата': '2024-03-14', 'Статус': 'Доставлен' },
  { '№ Заказа': 'ORD-5618', 'Клиент': 'ООО Рост', 'Продукт': 'Клавиатура Logitech', 'Сумма': '8 990 ₽', 'Дата': '2024-03-13', 'Статус': 'Отменён' },
  { '№ Заказа': 'ORD-5617', 'Клиент': 'ИП Кузнецов', 'Продукт': 'Принтер HP', 'Сумма': '32 990 ₽', 'Дата': '2024-03-13', 'Статус': 'Доставлен' },
];

export default function ReportsSection({ reports, tables, relations, onReportsChange }: Props) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(reports[0] || null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [newReport, setNewReport] = useState<Partial<Report>>({ columns: [], filters: [], joinType: 'LEFT' });

  const exportReport = (report: Report, format: 'csv' | 'json') => {
    const headers = report.columns.map(c => c.columnName);
    let data = '';
    let mimeType = 'text/plain';
    const filename = `${report.name}.${format}`;

    if (format === 'csv') {
      const rows = sampleReportData.map(r => Object.values(r).join(','));
      data = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv;charset=utf-8;';
    } else {
      data = JSON.stringify({ report: report.name, columns: headers, rows: sampleReportData }, null, 2);
      mimeType = 'application/json';
    }

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

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const deleteReport = (id: string) => {
    onReportsChange(reports.filter(r => r.id !== id));
    if (selectedReport?.id === id) setSelectedReport(null);
  };

  const saveReport = () => {
    if (!newReport.name) return;
    const report: Report = {
      id: `rep${Date.now()}`,
      name: newReport.name,
      description: newReport.description,
      columns: newReport.columns || [],
      filters: newReport.filters || [],
      joinType: newReport.joinType || 'LEFT',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    onReportsChange([...reports, report]);
    setNewReport({ columns: [], filters: [], joinType: 'LEFT' });
    setShowBuilder(false);
    setSelectedReport(report);
  };

  const addColumn = (tableId: string, tableName: string, columnName: string) => {
    const col: ReportColumn = { tableId, tableName, columnId: columnName.toLowerCase().replace(/ /g, '_'), columnName };
    setNewReport(p => ({ ...p, columns: [...(p.columns || []), col] }));
  };

  const removeColumn = (idx: number) => {
    setNewReport(p => ({ ...p, columns: (p.columns || []).filter((_, i) => i !== idx) }));
  };

  const addFilter = () => {
    const filter: ReportFilter = { tableId: '', columnId: '', operator: '=', value: '' };
    setNewReport(p => ({ ...p, filters: [...(p.filters || []), filter] }));
  };

  const getConnectedTables = () => {
    const connected = new Set<string>();
    relations.forEach(r => { connected.add(r.sourceTable); connected.add(r.targetTable); });
    return tables.filter(t => connected.has(t.id));
  };

  return (
    <div className="flex h-full bg-white">
      {/* Reports list sidebar */}
      <div className="w-64 border-r flex flex-col bg-gray-50">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Отчёты</span>
          <button
            className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 px-1.5 py-0.5 rounded hover:bg-green-50"
            onClick={() => setShowBuilder(true)}
          >
            <Icon name="Plus" size={12} />
            Создать
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {reports.map(report => (
            <div
              key={report.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer group hover:bg-blue-50 transition-colors ${selectedReport?.id === report.id ? 'bg-blue-100' : ''}`}
              onClick={() => { setSelectedReport(report); setShowBuilder(false); setShowResults(false); }}
            >
              <Icon name="BarChart3" size={14} className="text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{report.name}</div>
                <div className="text-xs text-gray-400">{report.columns.length} столбцов</div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-600"
                onClick={e => { e.stopPropagation(); deleteReport(report.id); }}
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400 px-3">
              Нет отчётов. Создайте первый.
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto">
        {showBuilder ? (
          <div className="p-6 max-w-3xl animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setShowBuilder(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="ChevronLeft" size={18} />
              </button>
              <h2 className="text-base font-semibold">Конструктор отчёта</h2>
            </div>

            {/* Report name */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Название отчёта *</label>
              <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="Например: Заказы с клиентами"
                value={newReport.name || ''}
                onChange={e => setNewReport(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Описание</label>
              <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="Краткое описание отчёта"
                value={newReport.description || ''}
                onChange={e => setNewReport(p => ({ ...p, description: e.target.value }))} />
            </div>

            {/* Columns selection */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 block mb-2">Столбцы отчёта</label>
              <div className="grid grid-cols-2 gap-3">
                {getConnectedTables().map(table => (
                  <div key={table.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon name="Table2" size={13} className="text-green-600" />
                      <span className="text-xs font-semibold">{table.name.replace('.xlsx', '')}</span>
                    </div>
                    <div className="space-y-1">
                      {(mockColumns[table.id] || []).map(col => {
                        const added = (newReport.columns || []).some(c => c.tableId === table.id && c.columnName === col);
                        return (
                          <div
                            key={col}
                            className={`flex items-center justify-between px-2 py-1 text-xs rounded cursor-pointer transition-colors ${added ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
                            onClick={() => added ? removeColumn((newReport.columns || []).findIndex(c => c.tableId === table.id && c.columnName === col)) : addColumn(table.id, table.name.replace('.xlsx', ''), col)}
                          >
                            <span>{col}</span>
                            {added ? <Icon name="Check" size={11} className="text-green-600" /> : <Icon name="Plus" size={11} className="text-gray-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected columns preview */}
            {(newReport.columns || []).length > 0 && (
              <div className="mb-5 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs font-medium text-gray-500 mb-2">Выбрано столбцов: {newReport.columns?.length}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(newReport.columns || []).map((col, i) => (
                    <span key={i} className="flex items-center gap-1 bg-white border px-2 py-0.5 rounded text-xs">
                      <span className="text-green-600">{col.tableName}.</span>{col.columnName}
                      <button onClick={() => removeColumn(i)} className="text-gray-400 hover:text-red-500 ml-1"><Icon name="X" size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Фильтры</label>
                <button onClick={addFilter} className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1">
                  <Icon name="Plus" size={11} />Добавить фильтр
                </button>
              </div>
              {(newReport.filters || []).map((filter, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <select className="flex-1 text-xs border rounded px-2 py-1.5 focus:outline-none bg-white"
                    value={filter.tableId}
                    onChange={e => {
                      const filters = [...(newReport.filters || [])];
                      filters[i] = { ...filters[i], tableId: e.target.value };
                      setNewReport(p => ({ ...p, filters }));
                    }}>
                    <option value="">Таблица</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name.replace('.xlsx', '')}</option>)}
                  </select>
                  <input className="flex-1 text-xs border rounded px-2 py-1.5 focus:outline-none"
                    placeholder="Столбец" value={filter.columnId}
                    onChange={e => {
                      const filters = [...(newReport.filters || [])];
                      filters[i] = { ...filters[i], columnId: e.target.value };
                      setNewReport(p => ({ ...p, filters }));
                    }} />
                  <select className="text-xs border rounded px-1.5 py-1.5 focus:outline-none bg-white"
                    value={filter.operator}
                    onChange={e => {
                      const filters = [...(newReport.filters || [])];
                      filters[i] = { ...filters[i], operator: e.target.value as ReportFilter['operator'] };
                      setNewReport(p => ({ ...p, filters }));
                    }}>
                    {(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'] as const).map(op => <option key={op}>{op}</option>)}
                  </select>
                  <input className="flex-1 text-xs border rounded px-2 py-1.5 focus:outline-none"
                    placeholder="Значение" value={filter.value}
                    onChange={e => {
                      const filters = [...(newReport.filters || [])];
                      filters[i] = { ...filters[i], value: e.target.value };
                      setNewReport(p => ({ ...p, filters }));
                    }} />
                </div>
              ))}
            </div>

            {/* Join type */}
            <div className="mb-6">
              <label className="text-xs font-medium text-gray-600 block mb-2">Тип объединения таблиц</label>
              <div className="flex gap-2">
                {(['INNER', 'LEFT', 'RIGHT'] as const).map(jt => (
                  <button key={jt}
                    className={`px-4 py-1.5 text-xs rounded border transition-colors ${newReport.joinType === jt ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:border-green-400'}`}
                    onClick={() => setNewReport(p => ({ ...p, joinType: jt }))}>
                    {jt} JOIN
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={saveReport} className="px-6 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Сохранить отчёт</button>
              <button onClick={() => setShowBuilder(false)} className="px-4 py-2 border text-sm rounded hover:bg-gray-100">Отмена</button>
            </div>
          </div>
        ) : selectedReport ? (
          <div className="p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{selectedReport.name}</h2>
                {selectedReport.description && <p className="text-sm text-gray-500 mt-1">{selectedReport.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{selectedReport.joinType} JOIN</span>
                  <span className="text-xs text-gray-400">{selectedReport.columns.length} столбцов</span>
                  {selectedReport.filters.length > 0 && <span className="text-xs text-gray-400">{selectedReport.filters.length} фильтров</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowResults(!showResults)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
                  <Icon name={showResults ? 'EyeOff' : 'Play'} size={14} />
                  {showResults ? 'Скрыть' : 'Выполнить'}
                </button>
                <div className="relative">
                  <button
                    className="flex items-center gap-2 px-4 py-2 border text-sm rounded hover:bg-gray-50"
                    onClick={() => setExportMenuOpen(p => !p)}
                  >
                    <Icon name="Download" size={14} />
                    Экспорт
                    <Icon name="ChevronDown" size={12} />
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px] animate-fade-in">
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-left"
                        onClick={() => { exportReport(selectedReport!, 'csv'); setExportMenuOpen(false); }}
                      >
                        <Icon name="FileText" size={14} className="text-blue-500" />
                        Скачать CSV
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-left"
                        onClick={() => { exportReport(selectedReport!, 'json'); setExportMenuOpen(false); }}
                      >
                        <Icon name="Braces" size={14} className="text-purple-500" />
                        Скачать JSON
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Columns info */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Столбцы</div>
              <div className="flex flex-wrap gap-2">
                {selectedReport.columns.map((col, i) => (
                  <div key={i} className="flex items-center gap-1 bg-gray-50 border px-3 py-1.5 rounded text-sm">
                    <span className="text-green-600 text-xs">{col.tableName}.</span>
                    <span className="font-medium">{col.columnName}</span>
                    {col.alias && <span className="text-gray-400 text-xs">as {col.alias}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Generated SQL preview */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Предварительный SQL</div>
              <div className="bg-gray-900 text-green-300 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div><span className="text-blue-400">SELECT</span></div>
                {selectedReport.columns.map((col, i) => (
                  <div key={i} className="ml-4">{`\`${col.tableName}\`.\`${col.columnName}\`${i < selectedReport.columns.length - 1 ? ',' : ''}`}</div>
                ))}
                <div><span className="text-blue-400">FROM</span> <span className="text-yellow-300">{selectedReport.columns[0]?.tableName}</span></div>
                {selectedReport.columns.slice(1).reduce((acc, col) => {
                  const tableName = col.tableName;
                  if (!acc.includes(tableName)) acc.push(tableName);
                  return acc;
                }, [] as string[]).map((tbl, i) => (
                  <div key={i} className="ml-4"><span className="text-blue-400">{selectedReport.joinType} JOIN</span> <span className="text-yellow-300">{tbl}</span> <span className="text-blue-400">ON</span> ...</div>
                ))}
                {selectedReport.filters.length > 0 && (
                  <>
                    <div><span className="text-blue-400">WHERE</span></div>
                    {selectedReport.filters.map((f, i) => (
                      <div key={i} className="ml-4">{`\`${f.columnId}\` ${f.operator} '${f.value}'${i < selectedReport.filters.length - 1 ? ' AND' : ''}`}</div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Results table */}
            {showResults && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Результаты ({sampleReportData.length} строк)</div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        {Object.keys(sampleReportData[0]).map(k => (
                          <th key={k} className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleReportData.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-blue-50">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-3 py-2 text-gray-700">
                              {val === 'Доставлен' ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">{val}</span>
                                : val === 'В пути' ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{val}</span>
                                : val === 'Отменён' ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">{val}</span>
                                : val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Icon name="BarChart3" size={40} className="mx-auto mb-3 opacity-20" />
              <div className="text-sm">Выберите отчёт или создайте новый</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}