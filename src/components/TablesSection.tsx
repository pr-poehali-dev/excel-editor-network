import { useState } from 'react';
import { Folder, TableFile } from '@/types';
import Icon from '@/components/ui/icon';

interface Props {
  folders: Folder[];
  tables: TableFile[];
  onOpenTable: (tableId: string) => void;
  onFoldersChange: (folders: Folder[]) => void;
  onImportClick: () => void;
}

export default function TablesSection({ folders, tables, onOpenTable, onFoldersChange, onImportClick }: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['f1', 'f2', 'f3']));
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const toggleFolder = (id: string) => {
    const next = new Set(expandedFolders);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setExpandedFolders(next);
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const folder: Folder = {
      id: `f${Date.now()}`,
      name: newFolderName.trim(),
      parentId: null,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    onFoldersChange([...folders, folder]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const deleteFolder = (id: string) => {
    onFoldersChange(folders.filter(f => f.id !== id));
  };

  const rootFolders = folders.filter(f => f.parentId === null);
  const allTables = searchQuery
    ? tables.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : tables;

  const getFolderTables = (folderId: string | null) =>
    allTables.filter(t => t.folderId === folderId);

  const getFolderChildren = (parentId: string) =>
    folders.filter(f => f.parentId === parentId);

  const renderFolder = (folder: Folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const children = getFolderChildren(folder.id);
    const folderTables = getFolderTables(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer group hover:bg-gray-100 ${selectedItem === folder.id ? 'bg-blue-50' : ''}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => { toggleFolder(folder.id); setSelectedItem(folder.id); }}
        >
          <Icon name={isExpanded ? 'ChevronDown' : 'ChevronRight'} size={14} className="text-gray-400 flex-shrink-0" />
          <Icon name={isExpanded ? 'FolderOpen' : 'Folder'} size={15} className="text-yellow-500 flex-shrink-0" />
          <span className="text-sm flex-1 truncate">{folder.name}</span>
          <span className="text-xs text-gray-400">{folderTables.length + children.length}</span>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 hover:text-red-600 ml-1"
            onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
          >
            <Icon name="X" size={12} />
          </button>
        </div>
        {isExpanded && (
          <div>
            {children.map(child => renderFolder(child, depth + 1))}
            {folderTables.map(table => renderTableRow(table, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderTableRow = (table: TableFile, depth = 0) => (
    <div
      key={table.id}
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group hover:bg-blue-50 ${selectedItem === table.id ? 'bg-blue-100' : ''}`}
      style={{ paddingLeft: `${24 + depth * 16}px` }}
      onDoubleClick={() => onOpenTable(table.id)}
      onClick={() => setSelectedItem(table.id)}
    >
      <Icon name="FileSpreadsheet" size={14} className="text-green-600 flex-shrink-0" />
      <span className="text-sm flex-1 truncate">{table.name}</span>
      <span className="text-xs text-gray-400">{table.rowCount} стр.</span>
      <button
        className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
        onClick={e => { e.stopPropagation(); onOpenTable(table.id); }}
      >
        Открыть
      </button>
    </div>
  );

  const uncategorized = getFolderTables(null);

  return (
    <div className="flex h-full bg-white">
      {/* Left tree panel */}
      <div className="w-64 border-r flex flex-col bg-gray-50">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Папки</span>
          <button
            className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 px-1.5 py-0.5 rounded hover:bg-green-50"
            onClick={() => setShowNewFolder(true)}
          >
            <Icon name="Plus" size={12} />
            Новая
          </button>
        </div>

        {showNewFolder && (
          <div className="px-2 py-2 border-b bg-white animate-fade-in">
            <div className="flex gap-1">
              <input
                autoFocus
                className="flex-1 text-sm border rounded px-2 py-1 outline-none focus:border-green-500"
                placeholder="Название папки..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              />
              <button onClick={createFolder} className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                <Icon name="Check" size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {rootFolders.map(folder => renderFolder(folder))}
          {uncategorized.length > 0 && (
            <div>
              <div className="flex items-center gap-1 px-2 py-1.5 text-gray-500">
                <Icon name="ChevronDown" size={14} />
                <Icon name="Folder" size={14} className="text-gray-400" />
                <span className="text-xs">Без папки</span>
              </div>
              {uncategorized.map(t => renderTableRow(t, 0))}
            </div>
          )}
        </div>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
          <div className="relative flex-1 max-w-xs">
            <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
              placeholder="Поиск таблиц..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center border rounded overflow-hidden">
            <button
              className={`p-1.5 ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              onClick={() => setViewMode('list')}
            >
              <Icon name="List" size={14} />
            </button>
            <button
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              onClick={() => setViewMode('grid')}
            >
              <Icon name="LayoutGrid" size={14} />
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            onClick={onImportClick}
          >
            <Icon name="Upload" size={14} />
            Импорт Excel
          </button>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'list' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Имя файла</th>
                  <th className="text-left pb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Папка</th>
                  <th className="text-right pb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Строк</th>
                  <th className="text-right pb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Столбцов</th>
                  <th className="text-left pb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Изменено</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {allTables.map(table => {
                  const folder = folders.find(f => f.id === table.folderId);
                  return (
                    <tr key={table.id} className="border-b hover:bg-blue-50 group cursor-pointer" onDoubleClick={() => onOpenTable(table.id)}>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <Icon name="FileSpreadsheet" size={16} className="text-green-600" />
                          <span className="font-medium text-gray-800">{table.name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {folder ? <span className="flex items-center gap-1"><Icon name="Folder" size={12} className="text-yellow-500" />{folder.name}</span> : '—'}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-xs text-gray-600">{table.rowCount.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right font-mono text-xs text-gray-600">{table.colCount}</td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{table.updatedAt}</td>
                      <td className="py-2">
                        <button
                          className="opacity-0 group-hover:opacity-100 px-2.5 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-all"
                          onClick={() => onOpenTable(table.id)}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allTables.map(table => {
                const folder = folders.find(f => f.id === table.folderId);
                return (
                  <div
                    key={table.id}
                    className="border rounded-lg p-4 hover:border-green-400 hover:shadow-md cursor-pointer transition-all group bg-white"
                    onDoubleClick={() => onOpenTable(table.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <Icon name="FileSpreadsheet" size={22} className="text-green-600" />
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700"
                        onClick={() => onOpenTable(table.id)}
                      >
                        Открыть
                      </button>
                    </div>
                    <div className="font-medium text-sm text-gray-800 truncate">{table.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{folder?.name || 'Без папки'}</div>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>{table.rowCount.toLocaleString()} стр.</span>
                      <span>{table.colCount} кол.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 px-4 py-1.5 border-t bg-gray-50 text-xs text-gray-500">
          <span>{allTables.length} файлов</span>
          <span>·</span>
          <span>{folders.length} папок</span>
          {selectedItem && <span>· Выбрано: {tables.find(t => t.id === selectedItem)?.name || folders.find(f => f.id === selectedItem)?.name}</span>}
        </div>
      </div>
    </div>
  );
}