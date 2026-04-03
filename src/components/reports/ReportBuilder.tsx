import { TableFile } from '@/types';
import { ReportFilter } from '@/types';
import Icon from '@/components/ui/icon';
import {
  BuilderState,
  Aggregate,
  ColumnWithAgg,
  ReportsTableData,
  buildSQL,
  getColsForTable,
} from './reportsTypes';

interface Props {
  b: BuilderState;
  setB: React.Dispatch<React.SetStateAction<BuilderState>>;
  tables: TableFile[];
  tableDataMap: Record<string, ReportsTableData>;
  onSave: () => void;
  onCancel: () => void;
}

export default function ReportBuilder({ b, setB, tables, tableDataMap, onSave, onCancel }: Props) {
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

  return (
    <div className="p-6 max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><Icon name="ChevronLeft" size={18} /></button>
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
          onClick={onSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="Save" size={14} />Сохранить отчёт
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 border text-sm rounded hover:bg-gray-50 transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}
