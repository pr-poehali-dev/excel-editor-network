import { useState } from 'react';
import { Relation, TableFile, TableData } from '@/types';
import Icon from '@/components/ui/icon';

interface Props {
  relations: Relation[];
  tables: TableFile[];
  tableData: TableData;
  tableDataMap: Record<string, TableData>;
  onRelationsChange: (r: Relation[]) => void;
  onTableDataChange: (t: TableData) => void;
}

export default function RelationsSection({ relations, tables, tableData, tableDataMap, onRelationsChange, onTableDataChange }: Props) {
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newRelation, setNewRelation] = useState<Partial<Relation>>({ type: 'one-to-many' });
  const [activeTab, setActiveTab] = useState<'relations' | 'keys'>('relations');

  const [selectedTableId, setSelectedTableId] = useState<string>(tableData.id);
  const activeTableData = tableDataMap[selectedTableId] ?? tableData;

  const [pendingPK, setPendingPK] = useState<string>(activeTableData.primaryKey || '');
  const [fkState, setFkState] = useState<Record<string, { enabled: boolean; refTable: string }>>(
    Object.fromEntries(activeTableData.columns.map(c => [c.id, { enabled: c.isForeignKey || false, refTable: c.referencesTable || '' }]))
  );
  const [keysSaved, setKeysSaved] = useState(false);

  const handleTableSelect = (newId: string) => {
    setSelectedTableId(newId);
    const td = tableDataMap[newId] ?? tableData;
    setPendingPK(td.primaryKey || '');
    setFkState(Object.fromEntries(td.columns.map(c => [c.id, { enabled: c.isForeignKey || false, refTable: c.referencesTable || '' }])));
    setKeysSaved(false);
  };

  const addRelation = () => {
    if (!newRelation.sourceTable || !newRelation.targetTable || !newRelation.sourceColumn || !newRelation.targetColumn) return;
    const rel: Relation = {
      id: `r${Date.now()}`,
      sourceTable: newRelation.sourceTable,
      sourceColumn: newRelation.sourceColumn,
      targetTable: newRelation.targetTable,
      targetColumn: newRelation.targetColumn,
      type: newRelation.type || 'one-to-many'
    };
    onRelationsChange([...relations, rel]);
    setNewRelation({ type: 'one-to-many' });
    setShowAddRelation(false);
  };

  const deleteRelation = (id: string) => onRelationsChange(relations.filter(r => r.id !== id));

  const getTableName = (id: string) => tables.find(t => t.id === id)?.name.replace('.xlsx', '') || id;
  const typeIcon = (type: Relation['type']) => type === 'one-to-one' ? '1:1' : type === 'one-to-many' ? '1:N' : 'N:M';
  const typeColor = (type: Relation['type']) =>
    type === 'one-to-one' ? 'bg-blue-100 text-blue-700' : type === 'one-to-many' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

  const getColsForTable = (tableId: string) => {
    const td = tableDataMap[tableId];
    return td ? td.columns.map(c => c.name) : [];
  };

  const saveKeys = () => {
    const base = tableDataMap[selectedTableId] ?? tableData;
    const updated: TableData = {
      ...base,
      primaryKey: pendingPK,
      columns: base.columns.map(c => ({
        ...c,
        isPrimaryKey: c.id === pendingPK,
        isForeignKey: fkState[c.id]?.enabled || false,
        referencesTable: fkState[c.id]?.enabled ? fkState[c.id].refTable : undefined,
      })),
    };
    onTableDataChange(updated);
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex border-b bg-gray-50 flex-shrink-0">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'relations' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('relations')}
        >
          <Icon name="GitBranch" size={15} />Связи между таблицами
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'keys' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('keys')}
        >
          <Icon name="Key" size={15} />Первичные и внешние ключи
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ═══════════════ RELATIONS ═══════════════ */}
        {activeTab === 'relations' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Связи между таблицами</h2>
                <p className="text-sm text-gray-500 mt-0.5">Определите отношения для использования в отчётах</p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                onClick={() => setShowAddRelation(!showAddRelation)}
              >
                <Icon name={showAddRelation ? 'X' : 'Plus'} size={14} />
                {showAddRelation ? 'Отмена' : 'Добавить связь'}
              </button>
            </div>

            {/* Diagram */}
            <div className="bg-gray-50 border rounded-lg p-5 mb-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Схема</div>
              <div className="flex gap-3 flex-wrap">
                {tables.slice(0, 6).map(table => {
                  const hasRel = relations.some(r => r.sourceTable === table.id || r.targetTable === table.id);
                  return (
                    <div key={table.id} className={`border-2 rounded-lg px-3 py-2 bg-white shadow-sm ${hasRel ? 'border-green-400' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon name="Table2" size={12} className="text-green-600" />
                        <span className="text-xs font-semibold">{table.name.replace('.xlsx', '')}</span>
                      </div>
                      <div className="text-[11px] text-gray-400">{table.rowCount.toLocaleString()} строк</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add form */}
            {showAddRelation && (
              <div className="mb-5 p-5 border-2 border-green-200 rounded-lg bg-green-50 animate-fade-in">
                <div className="text-sm font-semibold text-gray-700 mb-4">Новая связь</div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Таблица-источник</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:border-green-500"
                      value={newRelation.sourceTable || ''}
                      onChange={e => setNewRelation(p => ({ ...p, sourceTable: e.target.value, sourceColumn: '' }))}>
                      <option value="">Выберите...</option>
                      {tables.map(t => <option key={t.id} value={t.id}>{t.name.replace('.xlsx', '')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Столбец-источник</label>
                    {getColsForTable(newRelation.sourceTable || '').length > 0 ? (
                      <select className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:border-green-500"
                        value={newRelation.sourceColumn || ''}
                        onChange={e => setNewRelation(p => ({ ...p, sourceColumn: e.target.value }))}>
                        <option value="">Выберите столбец...</option>
                        {getColsForTable(newRelation.sourceTable || '').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:border-green-500"
                        placeholder="например: client_id"
                        value={newRelation.sourceColumn || ''}
                        onChange={e => setNewRelation(p => ({ ...p, sourceColumn: e.target.value }))} />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Таблица-цель</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:border-green-500"
                      value={newRelation.targetTable || ''}
                      onChange={e => setNewRelation(p => ({ ...p, targetTable: e.target.value, targetColumn: '' }))}>
                      <option value="">Выберите...</option>
                      {tables.map(t => <option key={t.id} value={t.id}>{t.name.replace('.xlsx', '')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Столбец-цель</label>
                    {getColsForTable(newRelation.targetTable || '').length > 0 ? (
                      <select className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:border-green-500"
                        value={newRelation.targetColumn || ''}
                        onChange={e => setNewRelation(p => ({ ...p, targetColumn: e.target.value }))}>
                        <option value="">Выберите столбец...</option>
                        {getColsForTable(newRelation.targetTable || '').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:border-green-500"
                        placeholder="например: id"
                        value={newRelation.targetColumn || ''}
                        onChange={e => setNewRelation(p => ({ ...p, targetColumn: e.target.value }))} />
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-1.5">Тип связи</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['one-to-one', 'one-to-many', 'many-to-many'] as const).map(t => (
                      <button key={t}
                        onClick={() => setNewRelation(p => ({ ...p, type: t }))}
                        className={`px-3 py-1 text-xs rounded border transition-colors ${newRelation.type === t ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:border-green-400'}`}>
                        {t === 'one-to-one' ? '1:1' : t === 'one-to-many' ? '1:N' : 'N:M'}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={addRelation}
                  disabled={!newRelation.sourceTable || !newRelation.targetTable || !newRelation.sourceColumn || !newRelation.targetColumn}
                  className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Сохранить связь
                </button>
              </div>
            )}

            {/* Relations list */}
            <div className="space-y-3">
              {relations.map(rel => (
                <div key={rel.id} className="flex items-center gap-4 p-4 border rounded-lg hover:border-green-300 group transition-all bg-white">
                  <div className="flex-1 flex items-center gap-3 flex-wrap">
                    <div className="text-center min-w-[110px]">
                      <div className="text-xs text-gray-400 mb-0.5">Источник</div>
                      <div className="font-medium text-sm">{getTableName(rel.sourceTable)}</div>
                      <div className="text-xs text-green-600 font-mono">{rel.sourceColumn}</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeColor(rel.type)}`}>{typeIcon(rel.type)}</span>
                      <div className="flex items-center gap-0.5">
                        <div className="w-5 h-px bg-gray-400" />
                        <Icon name="ArrowRight" size={12} className="text-gray-400" />
                        <div className="w-5 h-px bg-gray-400" />
                      </div>
                    </div>
                    <div className="text-center min-w-[110px]">
                      <div className="text-xs text-gray-400 mb-0.5">Цель</div>
                      <div className="font-medium text-sm">{getTableName(rel.targetTable)}</div>
                      <div className="text-xs text-green-600 font-mono">{rel.targetColumn}</div>
                    </div>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 hover:text-red-600 text-gray-400 transition-all"
                    onClick={() => deleteRelation(rel.id)}
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              ))}
              {relations.length === 0 && !showAddRelation && (
                <div className="text-center py-12 text-gray-400">
                  <Icon name="GitBranch" size={32} className="mx-auto mb-3 opacity-30" />
                  <div className="text-sm">Связей нет. Нажмите «Добавить связь».</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ KEYS TAB ═══════════════ */}
        {activeTab === 'keys' && (
          <div className="max-w-2xl">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-800">Первичные и внешние ключи</h2>
              <p className="text-sm text-gray-500 mt-0.5">Выберите таблицу — столбцы обновятся автоматически</p>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Таблица</label>
              <select
                className="w-full border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-white"
                value={selectedTableId}
                onChange={e => handleTableSelect(e.target.value)}
              >
                {tables.map(t => <option key={t.id} value={t.id}>{t.name.replace('.xlsx', '')}</option>)}
              </select>
            </div>

            {activeTableData.columns.length > 0 ? (
              <div className="border rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Столбец</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Тип</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wide text-center">PK</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wide text-center">FK</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Ссылается на</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTableData.columns.map(col => (
                      <tr key={col.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {pendingPK === col.id && <Icon name="Key" size={12} className="text-yellow-500" />}
                            {fkState[col.id]?.enabled && <Icon name="Link" size={12} className="text-blue-500" />}
                            <span className="font-medium">{col.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{col.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="radio" name="pendingPK"
                            checked={pendingPK === col.id}
                            onChange={() => setPendingPK(col.id)}
                            className="w-4 h-4 accent-green-600 cursor-pointer" />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="checkbox"
                            checked={fkState[col.id]?.enabled || false}
                            onChange={e => setFkState(prev => ({
                              ...prev,
                              [col.id]: { enabled: e.target.checked, refTable: prev[col.id]?.refTable || '' }
                            }))}
                            className="w-4 h-4 accent-blue-600 cursor-pointer" />
                        </td>
                        <td className="px-4 py-2.5">
                          {fkState[col.id]?.enabled ? (
                            <select
                              className="text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-400 min-w-[130px]"
                              value={fkState[col.id]?.refTable || ''}
                              onChange={e => setFkState(prev => ({ ...prev, [col.id]: { ...prev[col.id], refTable: e.target.value } }))}
                            >
                              <option value="">Выберите таблицу...</option>
                              {tables.filter(t => t.id !== selectedTableId).map(t => (
                                <option key={t.id} value={t.name.replace('.xlsx', '')}>{t.name.replace('.xlsx', '')}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-gray-400 mb-4">
                <Icon name="Table2" size={24} className="mx-auto mb-2 opacity-40" />
                <div className="text-sm">Нет данных о столбцах для этой таблицы.</div>
                <div className="text-xs mt-1 text-gray-300">Откройте таблицу в редакторе или импортируйте файл.</div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                onClick={saveKeys}
              >
                <Icon name="Save" size={14} />Применить настройки
              </button>
              {keysSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 animate-fade-in">
                  <Icon name="CheckCircle2" size={14} />Сохранено
                </span>
              )}
            </div>

            <div className="mt-5 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <Icon name="Info" size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-700 leading-relaxed">
                <strong>PK</strong> — первичный ключ, уникальный идентификатор строки (только один на таблицу).{' '}
                <strong>FK</strong> — внешний ключ, ссылка на строку в другой таблице. Нужны для объединения таблиц в отчётах.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
