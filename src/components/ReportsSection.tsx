import { useState, useRef, useEffect } from 'react';
import { Report, ReportColumn, ReportFilter, TableFile, Relation } from '@/types';
import Icon from '@/components/ui/icon';
import { exportReportToXLSX, exportToCSV, exportToJSON, printTable } from '@/lib/excel';

interface TableData {
  columns: { id: string; name: string; type: string }[];
}

interface Props {
  reports: Report[];
  tables: TableFile[];
  relations: Relation[];
  tableDataMap: Record<string, TableData>;
  onReportsChange: (r: Report[]) => void;
}

type Aggregate = 'none' | 'SUM' | 'COUNT' | 'AVG' | 'MAX' | 'MIN';

interface ColumnWithAgg extends ReportColumn {
  aggregate?: Aggregate;
}

interface BuilderState {
  name: string;
  description: string;
  columns: ColumnWithAgg[];
  filters: ReportFilter[];
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  groupBy: string[];
  orderByCol: string;
  orderByDir: 'ASC' | 'DESC';
  limit: string;
}

const defaultBuilder = (): BuilderState => ({
  name: '', description: '', columns: [], filters: [],
  joinType: 'LEFT', groupBy: [], orderByCol: '', orderByDir: 'ASC', limit: '',
});

const mockColumns: Record<string, string[]> = {
  't1': ['ID', 'Артикул', 'Наименование', 'Категория', 'Цена', 'Цена со скидкой', 'Ед.изм.', 'Наличие'],
  't2': ['ID', 'Имя клиента', 'Email', 'Телефон', 'Город', 'Сегмент', 'Дата регистрации'],
  't3': ['ID заказа', 'ID клиента', 'ID продукта', 'Дата заказа', 'Количество', 'Сумма', 'Статус'],
  't4': ['Период', 'Доходы', 'Расходы', 'Прибыль', 'Бюджет', 'Факт', 'Отклонение'],
  't5': ['ID продукта', 'Артикул', 'Количество', 'Ячейка', 'Дата прихода', 'Дата выдачи'],
  't6': ['ID', 'ФИО', 'Должность', 'Отдел', 'Email', 'Телефон', 'Дата найма', 'Зарплата'],
};

const sampleData = [
  { '№ Заказа': 'ORD-5621', 'Клиент': 'ООО Технологии', 'Продукт': 'Ноутбук Dell', 'Сумма': '89 990 ₽', 'Дата': '2024-03-15', 'Статус': 'Доставлен' },
  { '№ Заказа': 'ORD-5620', 'Клиент': 'ИП Сидоров', 'Продукт': 'Монитор Samsung', 'Сумма': '24 990 ₽', 'Дата': '2024-03-14', 'Статус': 'В пути' },
  { '№ Заказа': 'ORD-5619', 'Клиент': 'АО Прогресс', 'Продукт': 'Наушники Sony', 'Сумма': '29 990 ₽', 'Дата': '2024-03-14', 'Статус': 'Доставлен' },
  { '№ Заказа': 'ORD-5618', 'Клиент': 'ООО Рост', 'Продукт': 'Клавиатура Logitech', 'Сумма': '8 990 ₽', 'Дата': '2024-03-13', 'Статус': 'Отменён' },
  { '№ Заказа': 'ORD-5617', 'Клиент': 'ИП Кузнецов', 'Продукт': 'Принтер HP', 'Сумма': '32 990 ₽', 'Дата': '2024-03-13', 'Статус': 'Доставлен' },
];

function getColsForTable(tableId: string, tdm: Record<string, TableData>): string[] {
  const td = tdm[tableId];
  if (td?.columns?.length) return td.columns.map(c => c.name);
  return mockColumns[tableId] || [];
}

function buildSQL(b: BuilderState): string {
  if (!b.columns.length) return '-- Добавьте столбцы для генерации SQL';
  const selects = b.columns.map(col => {
    const ref = `\`${col.tableName}\`.\`${col.columnName}\``;
    const expr = col.aggregate && col.aggregate !== 'none' ? `${col.aggregate}(${ref})` : ref;
    return col.alias ? `${expr} AS \`${col.alias}\`` : expr;
  });
  const firstTable = b.columns[0].tableName;
  const otherTables = [...new Set(b.columns.slice(1).map(c => c.tableName))].filter(t => t !== firstTable);
  const wheres = b.filters.filter(f => f.columnId && f.value).map(f => `  \`${f.columnId}\` ${f.operator} '${f.value}'`);
  return [
    `SELECT\n  ${selects.join(',\n  ')}`,
    `FROM \`${firstTable}\``,
    ...otherTables.map(t => `  ${b.joinType} JOIN \`${t}\` ON ...`),
    ...(wheres.length ? [`WHERE\n${wheres.join('\n  AND ')}`] : []),
    ...(b.groupBy.length ? [`GROUP BY ${b.groupBy.map(g => `\`${g}\``).join(', ')}`] : []),
    ...(b.orderByCol ? [`ORDER BY \`${b.orderByCol}\` ${b.orderByDir}`] : []),
    ...(b.limit ? [`LIMIT ${b.limit}`] : []),
  ].filter(Boolean).join('\n');
}

export default function ReportsSection({ reports, tables, tableDataMap, onReportsChange }: Props) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(reports[0] || null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [b, setB] = useState<BuilderState>(defaultBuilder());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const deleteReport = (id: string) => {
    onReportsChange(reports.filter(r => r.id !== id));
    if (selectedReport?.id === id) setSelectedReport(null);
  };

  const saveReport = () => {
    if (!b.name.trim() || !b.columns.length) return;
    const report: Report = {
      id: `rep${Date.now()}`,
      name: b.name,
      description: b.description,
      columns: b.columns,
      filters: b.filters,
      joinType: b.joinType === 'FULL' ? 'LEFT' : b.joinType,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onReportsChange([...reports, report]);
    setB(defaultBuilder());
    setShowBuilder(false);
    setSelectedReport(report);
  };

  const toggleColumn = (tableId: string, tableName: string, colName: string) => {
    const idx = b.columns.findIndex(c => c.tableId === tableId && c.columnName === colName);
    if (idx >= 0) {
      setB(p => ({ ...p, columns: p.columns.filter((_, i) => i !== idx) }));
    } else {
      const col: ColumnWithAgg = { tableId, tableName, columnId: colName.toLowerCase().replace(/ /g, '_'), columnName: colName, aggregate: 'none' };
      setB(p => ({ ...p, columns: [...p.columns, col] }));
    }
  };

  const addFilter = () => setB(p => ({ ...p, filters: [...p.filters, { tableId: '', columnId: '', operator: '=', value: '' }] }));
  const removeFilter = (i: number) => setB(p => ({ ...p, filters: p.filters.filter((_, j) => j !== i) }));
  const updateFilter = (i: number, patch: Partial<ReportFilter>) =>
    setB(p => ({ ...p, filters: p.filters.map((f, j) => j === i ? { ...f, ...patch } : f) }));

  const exportReport = (report: Report, fmt: 'xlsx' | 'csv' | 'json') => {
    setExportMenuOpen(false);
    const headers = report.columns.map(c => c.alias || c.columnName);
    const rows = sampleData.map(r => Object.values(r) as string[]);
    if (fmt === 'xlsx') exportReportToXLSX(report.name, headers, sampleData);
    else if (fmt === 'csv') exportToCSV(headers, rows, report.name);
    else exportToJSON({ report: report.name, columns: headers, rows: sampleData }, report.name);
  };

  const printReport = (report: Report) => {
    const headers = report.columns.map(c => c.alias || c.columnName);
    const rows = sampleData.map(r => Object.values(r) as string[]);
    printTable(report.name, headers, rows, 'landscape');
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 border-r flex flex-col bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Отчёты</span>
          <button className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 px-1.5 py-0.5 rounded hover:bg-green-50"
            onClick={() => { setShowBuilder(true); setSelectedReport(null); setB(defaultBuilder()); }}>
            <Icon name="Plus" size={12} />Создать
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {reports.map(report => (
            <div key={report.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer group hover:bg-blue-50 transition-colors ${selectedReport?.id === report.id && !showBuilder ? 'bg-blue-100' : ''}`}
              onClick={() => { setSelectedReport(report); setShowBuilder(false); setShowResults(false); }}>
              <Icon name="BarChart3" size={14} className="text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{report.name}</div>
                <div className="text-xs text-gray-400">{report.columns.length} столбцов</div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-600"
                onClick={e => { e.stopPropagation(); deleteReport(report.id); }}>
                <Icon name="X" size={12} />
              </button>
            </div>
          ))}
          {!reports.length && <div className="text-center py-8 text-xs text-gray-400 px-3">Нет отчётов.</div>}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {showBuilder ? (
          /* ══════ BUILDER ══════ */
          <div className="p-6 max-w-4xl animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setShowBuilder(false)} className="text-gray-400 hover:text-gray-600"><Icon name="ChevronLeft" size={18} /></button>
              <h2 className="text-base font-semibold">Конструктор отчёта</h2>
            </div>

            {/* Name & description */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Название *</label>
                <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  placeholder="Заказы с клиентами" value={b.name}
                  onChange={e => setB(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Описание</label>
                <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  placeholder="Краткое описание" value={b.description}
                  onChange={e => setB(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>

            {/* JOIN */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Тип объединения (JOIN)</label>
              <div className="flex gap-2 flex-wrap">
                {(['LEFT', 'INNER', 'RIGHT', 'FULL'] as const).map(j => (
                  <button key={j} onClick={() => setB(p => ({ ...p, joinType: j }))}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${b.joinType === j ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:border-green-400'}`}>
                    {j} JOIN
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                LEFT — все строки из первой таблицы · INNER — только совпадения · RIGHT — все из второй · FULL — все из обеих
              </div>
            </div>

            {/* Columns selection */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 block mb-2">Столбцы отчёта</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {tables.map(table => {
                  const cols = getColsForTable(table.id, tableDataMap);
                  if (!cols.length) return null;
                  return (
                    <div key={table.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon name="Table2" size={13} className="text-green-600" />
                        <span className="text-xs font-semibold">{table.name.replace('.xlsx', '')}</span>
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {cols.map(col => {
                          const added = b.columns.some(c => c.tableId === table.id && c.columnName === col);
                          return (
                            <div key={col}
                              className={`flex items-center justify-between px-2 py-1 text-xs rounded cursor-pointer transition-colors ${added ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
                              onClick={() => toggleColumn(table.id, table.name.replace('.xlsx', ''), col)}>
                              <span>{col}</span>
                              <Icon name={added ? 'Check' : 'Plus'} size={11} className={added ? 'text-green-600' : 'text-gray-400'} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected columns with aggregates */}
              {b.columns.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
                    Выбрано: {b.columns.length} столбцов
                  </div>
                  {b.columns.map((col, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 border-b last:border-0">
                      <div className="flex-1 text-sm min-w-0">
                        <span className="text-green-600 text-xs">{col.tableName}.</span>
                        <span className="font-medium">{col.columnName}</span>
                      </div>
                      <select className="text-xs border rounded px-2 py-1 bg-white focus:outline-none"
                        value={col.aggregate || 'none'}
                        onChange={e => setB(p => ({ ...p, columns: p.columns.map((c, j) => j === i ? { ...c, aggregate: e.target.value as Aggregate } : c) }))}
                        title="Агрегация">
                        <option value="none">— нет —</option>
                        {(['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'] as Aggregate[]).map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <input className="text-xs border rounded px-2 py-1 w-24 focus:outline-none"
                        placeholder="Псевдоним"
                        value={col.alias || ''}
                        onChange={e => setB(p => ({ ...p, columns: p.columns.map((c, j) => j === i ? { ...c, alias: e.target.value } : c) }))} />
                      <button onClick={() => setB(p => ({ ...p, columns: p.columns.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-500">
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Фильтры (WHERE)</label>
                <button onClick={addFilter} className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1">
                  <Icon name="Plus" size={11} />Добавить
                </button>
              </div>
              <div className="space-y-2">
                {b.filters.map((filter, i) => (
                  <div key={i} className="flex gap-2 items-start flex-wrap">
                    <select className="text-xs border rounded px-2 py-1.5 bg-white focus:outline-none min-w-[120px]"
                      value={filter.tableId}
                      onChange={e => updateFilter(i, { tableId: e.target.value, columnId: '' })}>
                      <option value="">Таблица...</option>
                      {tables.map(t => <option key={t.id} value={t.id}>{t.name.replace('.xlsx', '')}</option>)}
                    </select>
                    <select className="text-xs border rounded px-2 py-1.5 bg-white focus:outline-none min-w-[120px]"
                      value={filter.columnId}
                      onChange={e => updateFilter(i, { columnId: e.target.value })}>
                      <option value="">Столбец...</option>
                      {getColsForTable(filter.tableId, tableDataMap).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="text-xs border rounded px-1.5 py-1.5 bg-white focus:outline-none"
                      value={filter.operator}
                      onChange={e => updateFilter(i, { operator: e.target.value as ReportFilter['operator'] })}>
                      {(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'] as const).map(op => <option key={op}>{op}</option>)}
                    </select>
                    <div className="flex-1 min-w-[100px]">
                      <input className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none"
                        placeholder={filter.operator === 'LIKE' ? '%текст%' : filter.operator === 'IN' ? 'a, b, c' : 'Значение'}
                        value={filter.value}
                        onChange={e => updateFilter(i, { value: e.target.value })} />
                      {filter.operator === 'LIKE' && <div className="text-[10px] text-gray-400 mt-0.5">% — любые символы, _ — один символ</div>}
                      {filter.operator === 'IN' && <div className="text-[10px] text-gray-400 mt-0.5">Через запятую: Доставлен, В пути</div>}
                    </div>
                    <button onClick={() => removeFilter(i)} className="text-gray-400 hover:text-red-500 mt-1.5"><Icon name="X" size={12} /></button>
                  </div>
                ))}
                {b.filters.length === 0 && <div className="text-xs text-gray-400">Фильтры не добавлены — вернутся все строки</div>}
              </div>
            </div>

            {/* GROUP BY */}
            {b.columns.length > 0 && (
              <div className="mb-5">
                <label className="text-xs font-medium text-gray-600 block mb-2">Группировка (GROUP BY)</label>
                <div className="flex flex-wrap gap-2">
                  {b.columns.map((col, i) => {
                    const active = b.groupBy.includes(col.columnName);
                    return (
                      <button key={i}
                        onClick={() => setB(p => ({ ...p, groupBy: active ? p.groupBy.filter(g => g !== col.columnName) : [...p.groupBy, col.columnName] }))}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:border-blue-400'}`}>
                        {col.columnName}
                      </button>
                    );
                  })}
                </div>
                {b.groupBy.length === 0 && <div className="text-xs text-gray-400 mt-1">Без группировки — каждая строка выводится отдельно</div>}
              </div>
            )}

            {/* ORDER BY + LIMIT */}
            <div className="mb-5 grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Сортировка (ORDER BY)</label>
                <select className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:border-green-500"
                  value={b.orderByCol}
                  onChange={e => setB(p => ({ ...p, orderByCol: e.target.value }))}>
                  <option value="">— без сортировки —</option>
                  {b.columns.map((col, i) => <option key={i} value={col.columnName}>{col.columnName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Направление</label>
                <div className="flex gap-2">
                  {(['ASC', 'DESC'] as const).map(d => (
                    <button key={d} onClick={() => setB(p => ({ ...p, orderByDir: d }))}
                      className={`flex-1 py-1.5 text-xs rounded border transition-colors ${b.orderByDir === d ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:border-green-400'}`}>
                      {d === 'ASC' ? '↑ ASC' : '↓ DESC'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Лимит строк (LIMIT)</label>
                <input type="number" min="1"
                  className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
                  placeholder="Все строки"
                  value={b.limit}
                  onChange={e => setB(p => ({ ...p, limit: e.target.value }))} />
              </div>
            </div>

            {/* SQL preview */}
            {b.columns.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Предварительный SQL</div>
                <pre className="bg-gray-900 text-green-300 rounded-lg p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {buildSQL(b)}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                disabled={!b.name.trim() || !b.columns.length}
                onClick={saveReport}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="Save" size={14} />Сохранить отчёт
              </button>
              <button onClick={() => setShowBuilder(false)} className="px-4 py-2.5 border text-sm rounded hover:bg-gray-50 transition-colors">
                Отмена
              </button>
            </div>
          </div>

        ) : selectedReport ? (
          /* ══════ REPORT VIEW ══════ */
          <div className="p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{selectedReport.name}</h2>
                {selectedReport.description && <p className="text-sm text-gray-500 mt-1">{selectedReport.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{selectedReport.joinType || 'LEFT'} JOIN</span>
                  <span className="text-xs text-gray-400">{selectedReport.columns.length} столбцов</span>
                  {selectedReport.filters.length > 0 && <span className="text-xs text-gray-400">{selectedReport.filters.length} фильтров</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowResults(!showResults)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
                  <Icon name={showResults ? 'EyeOff' : 'Play'} size={14} />
                  {showResults ? 'Скрыть' : 'Выполнить'}
                </button>

                <div className="relative" ref={exportMenuRef}>
                  <button className="flex items-center gap-2 px-4 py-2 border text-sm rounded hover:bg-gray-50 transition-colors"
                    onClick={() => setExportMenuOpen(p => !p)}>
                    <Icon name="Download" size={14} />Экспорт<Icon name="ChevronDown" size={12} />
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[190px] animate-fade-in">
                      {([
                        { fmt: 'xlsx', icon: 'FileSpreadsheet', label: 'Excel (.xlsx)', cls: 'text-green-600' },
                        { fmt: 'csv', icon: 'FileText', label: 'CSV (UTF-8)', cls: 'text-blue-500' },
                        { fmt: 'json', icon: 'Braces', label: 'JSON', cls: 'text-purple-500' },
                      ] as const).map(({ fmt, icon, label, cls }) => (
                        <button key={fmt} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-left"
                          onClick={() => exportReport(selectedReport, fmt)}>
                          <Icon name={icon} size={14} className={cls} />{label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => printReport(selectedReport)}
                  className="flex items-center gap-2 px-4 py-2 border text-sm rounded hover:bg-gray-50 transition-colors">
                  <Icon name="Printer" size={14} />Печать
                </button>
              </div>
            </div>

            {/* Columns */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Столбцы</div>
              <div className="flex flex-wrap gap-2">
                {selectedReport.columns.map((col, i) => (
                  <div key={i} className="flex items-center gap-1 bg-gray-50 border px-3 py-1.5 rounded text-sm">
                    <span className="text-green-600 text-xs">{col.tableName}.</span>
                    <span className="font-medium">{col.columnName}</span>
                    {col.alias && <span className="text-gray-400 text-xs ml-1">→ {col.alias}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            {selectedReport.filters.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Фильтры</div>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.filters.map((f, i) => (
                    <span key={i} className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-1 rounded">
                      {f.columnId} {f.operator} '{f.value}'
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SQL */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">SQL-запрос</div>
              <div className="bg-gray-900 text-green-300 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div><span className="text-blue-400">SELECT</span></div>
                {selectedReport.columns.map((col, i) => (
                  <div key={i} className="ml-4">{`\`${col.tableName}\`.\`${col.columnName}\`${i < selectedReport.columns.length - 1 ? ',' : ''}`}</div>
                ))}
                <div><span className="text-blue-400">FROM</span> <span className="text-yellow-300">{selectedReport.columns[0]?.tableName}</span></div>
                {[...new Set(selectedReport.columns.slice(1).map(c => c.tableName))].filter(t => t !== selectedReport.columns[0]?.tableName).map((tbl, i) => (
                  <div key={i} className="ml-2">
                    <span className="text-blue-400">{selectedReport.joinType || 'LEFT'} JOIN</span>{' '}
                    <span className="text-yellow-300">{tbl}</span>{' '}
                    <span className="text-blue-400">ON</span> ...
                  </div>
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

            {/* Results */}
            {showResults && (
              <div className="animate-fade-in">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Результаты · {sampleData.length} строк (демо-данные)
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          {Object.keys(sampleData[0]).map(k => (
                            <th key={k} className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleData.map((row, i) => (
                          <tr key={i} className={`border-b last:border-0 hover:bg-blue-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-2 text-gray-700">{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <Icon name="BarChart3" size={40} className="mx-auto mb-3 opacity-20" />
              <div className="text-sm">Выберите отчёт слева или создайте новый</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
