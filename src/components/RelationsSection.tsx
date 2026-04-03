import { useState } from 'react';
import { Relation, TableFile, TableData } from '@/types';
import Icon from '@/components/ui/icon';

interface Props {
  relations: Relation[];
  tables: TableFile[];
  tableData: TableData;
  onRelationsChange: (r: Relation[]) => void;
  onTableDataChange: (t: TableData) => void;
}

export default function RelationsSection({ relations, tables, tableData, onRelationsChange, onTableDataChange }: Props) {
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newRelation, setNewRelation] = useState<Partial<Relation>>({ type: 'one-to-many' });
  const [activeTab, setActiveTab] = useState<'relations' | 'keys'>('relations');

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

  const togglePrimaryKey = (colId: string) => {
    const updated = { ...tableData };
    updated.columns = updated.columns.map(c => ({ ...c, isPrimaryKey: c.id === colId }));
    updated.primaryKey = colId;
    onTableDataChange(updated);
  };

  const getTableName = (id: string) => tables.find(t => t.id === id)?.name.replace('.xlsx', '') || id;

  const typeIcon = (type: Relation['type']) => {
    if (type === 'one-to-one') return '1:1';
    if (type === 'one-to-many') return '1:N';
    return 'N:M';
  };

  const typeColor = (type: Relation['type']) => {
    if (type === 'one-to-one') return 'bg-blue-100 text-blue-700';
    if (type === 'one-to-many') return 'bg-green-100 text-green-700';
    return 'bg-purple-100 text-purple-700';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex border-b bg-gray-50">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'relations' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('relations')}
        >
          <div className="flex items-center gap-2">
            <Icon name="GitBranch" size={15} />
            Связи между таблицами
          </div>
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'keys' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('keys')}
        >
          <div className="flex items-center gap-2">
            <Icon name="Key" size={15} />
            Первичные ключи
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'relations' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Связи между таблицами</h2>
                <p className="text-sm text-gray-500 mt-0.5">Определите отношения для использования в отчётах</p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                onClick={() => setShowAddRelation(true)}
              >
                <Icon name="Plus" size={14} />
                Добавить связь
              </button>
            </div>

            {/* Visual diagram */}
            <div className="bg-gray-50 border rounded-lg p-6 mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Схема связей</div>
              <div className="relative flex gap-12 items-center justify-center flex-wrap">
                {tables.slice(0, 5).map((table, i) => {
                  const hasRelations = relations.some(r => r.sourceTable === table.id || r.targetTable === table.id);
                  return (
                    <div key={table.id} className={`border-2 rounded-lg px-4 py-3 bg-white shadow-sm transition-all ${hasRelations ? 'border-green-400' : 'border-gray-200'}`} style={{ minWidth: 130 }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon name="Table2" size={13} className="text-green-600" />
                        <span className="text-xs font-semibold">{table.name.replace('.xlsx', '')}</span>
                      </div>
                      <div className="text-xs text-gray-400">{table.rowCount.toLocaleString()} строк</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Relations list */}
            <div className="space-y-3">
              {relations.map(rel => (
                <div key={rel.id} className="flex items-center gap-4 p-4 border rounded-lg hover:border-green-300 group transition-all bg-white">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="text-center min-w-28">
                      <div className="text-xs text-gray-400 mb-0.5">Таблица-источник</div>
                      <div className="font-medium text-sm text-gray-800">{getTableName(rel.sourceTable)}</div>
                      <div className="text-xs text-green-600 font-mono">{rel.sourceColumn}</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeColor(rel.type)}`}>{typeIcon(rel.type)}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-px bg-gray-400"></div>
                        <Icon name="ArrowRight" size={12} className="text-gray-400" />
                        <div className="w-8 h-px bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="text-center min-w-28">
                      <div className="text-xs text-gray-400 mb-0.5">Таблица-цель</div>
                      <div className="font-medium text-sm text-gray-800">{getTableName(rel.targetTable)}</div>
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
              {relations.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Icon name="GitBranch" size={32} className="mx-auto mb-3 opacity-30" />
                  <div className="text-sm">Связей нет. Добавьте первую связь между таблицами.</div>
                </div>
              )}
            </div>

            {/* Add relation form */}
            {showAddRelation && (
              <div className="mt-4 p-5 border-2 border-green-200 rounded-lg bg-green-50 animate-fade-in">
                <div className="text-sm font-semibold text-gray-700 mb-4">Новая связь</div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Таблица-источник</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:border-green-500 bg-white"
                      value={newRelation.sourceTable || ''}
                      onChange={e => setNewRelation(p => ({ ...p, sourceTable: e.target.value }))}>
                      <option value="">Выберите таблицу...</option>
                      {tables.map(t => <option key={t.id} value={t.id}>{t.name.replace('.xlsx', '')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Столбец-источник</label>
                    <input className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:border-green-500 bg-white"
                      placeholder="например: client_id"
                      value={newRelation.sourceColumn || ''}
                      onChange={e => setNewRelation(p => ({ ...p, sourceColumn: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Таблица-цель</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:border-green-500 bg-white"
                      value={newRelation.targetTable || ''}
                      onChange={e => setNewRelation(p => ({ ...p, targetTable: e.target.value }))}>
                      <option value="">Выберите таблицу...</option>
                      {tables.map(t => <option key={t.id} value={t.id}>{t.name.replace('.xlsx', '')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Столбец-цель</label>
                    <input className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:border-green-500 bg-white"
                      placeholder="например: id"
                      value={newRelation.targetColumn || ''}
                      onChange={e => setNewRelation(p => ({ ...p, targetColumn: e.target.value }))} />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-1">Тип связи</label>
                  <div className="flex gap-2">
                    {(['one-to-one', 'one-to-many', 'many-to-many'] as const).map(t => (
                      <button key={t} onClick={() => setNewRelation(p => ({ ...p, type: t }))}
                        className={`px-3 py-1 text-xs rounded border transition-colors ${newRelation.type === t ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:border-green-400'}`}>
                        {t === 'one-to-one' ? '1:1' : t === 'one-to-many' ? '1:N' : 'N:M'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addRelation} className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700">Сохранить</button>
                  <button onClick={() => setShowAddRelation(false)} className="px-4 py-1.5 border text-sm rounded hover:bg-gray-100">Отмена</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-800">Первичные ключи</h2>
              <p className="text-sm text-gray-500 mt-0.5">Укажите первичный ключ для таблицы «{tableData.name}»</p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Столбец</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Тип данных</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide text-center">Первичный ключ</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide text-center">Внешний ключ</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.columns.map(col => (
                    <tr key={col.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {col.isPrimaryKey && <Icon name="Key" size={13} className="text-yellow-500" />}
                          {col.isForeignKey && <Icon name="Link" size={13} className="text-blue-500" />}
                          <span className="font-medium">{col.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{col.type}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="radio"
                          name="primaryKey"
                          checked={col.isPrimaryKey || false}
                          onChange={() => togglePrimaryKey(col.id)}
                          className="w-4 h-4 accent-green-600"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input type="checkbox" checked={col.isForeignKey || false} readOnly className="w-4 h-4 accent-blue-600" />
                          {col.isForeignKey && <span className="text-xs text-blue-600">→ {col.referencesTable}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <Icon name="Info" size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-700">
                <strong>Первичный ключ</strong> — уникальный идентификатор каждой строки. Используется для создания связей между таблицами и построения отчётов.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
