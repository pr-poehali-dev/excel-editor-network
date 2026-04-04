import { useState, useRef, useEffect, useCallback } from 'react';
import { Section, TableFile, Folder, TableData, Relation, Report } from '@/types';
import TablesSection from '@/components/TablesSection';
import TableEditor from '@/components/TableEditor';
import RelationsSection from '@/components/RelationsSection';
import ReportsSection from '@/components/ReportsSection';
import ImportExportSection from '@/components/ImportExportSection';
import ConnectionDialog, { ConnectionConfig, DEFAULT_CONFIG } from '@/components/ConnectionDialog';
import Icon from '@/components/ui/icon';
import * as api from '@/lib/api';

const NAV_ITEMS: { id: Section; label: string; icon: string; desc: string }[] = [
  { id: 'tables', label: 'Таблицы', icon: 'LayoutGrid', desc: 'Управление файлами и папками' },
  { id: 'editor', label: 'Редактор', icon: 'Table2', desc: 'Редактирование ячеек' },
  { id: 'relations', label: 'Связи', icon: 'GitBranch', desc: 'Связи и ключи' },
  { id: 'reports', label: 'Отчёты', icon: 'BarChart3', desc: 'Конструктор запросов' },
  { id: 'import', label: 'Импорт/Экспорт', icon: 'ArrowLeftRight', desc: 'Загрузка и выгрузка' },
];

const MENU_ITEMS: Record<string, { label: string; shortcut?: string; divider?: boolean }[]> = {
  'Файл': [
    { label: 'Новая таблица', shortcut: 'Ctrl+N' },
    { label: 'Открыть файл...', shortcut: 'Ctrl+O' },
    { label: 'divider', divider: true },
    { label: 'Сохранить', shortcut: 'Ctrl+S' },
    { label: 'Сохранить как...', shortcut: 'Ctrl+Shift+S' },
    { label: 'divider', divider: true },
    { label: 'Импорт Excel...' },
    { label: 'Экспорт...' },
    { label: 'divider', divider: true },
    { label: 'Закрыть', shortcut: 'Ctrl+W' },
  ],
  'Правка': [
    { label: 'Отменить', shortcut: 'Ctrl+Z' },
    { label: 'Повторить', shortcut: 'Ctrl+Y' },
    { label: 'divider', divider: true },
    { label: 'Вырезать', shortcut: 'Ctrl+X' },
    { label: 'Копировать', shortcut: 'Ctrl+C' },
    { label: 'Вставить', shortcut: 'Ctrl+V' },
    { label: 'divider', divider: true },
    { label: 'Найти и заменить', shortcut: 'Ctrl+H' },
  ],
  'Вид': [
    { label: 'Таблицы', shortcut: 'Alt+1' },
    { label: 'Редактор', shortcut: 'Alt+2' },
    { label: 'Связи', shortcut: 'Alt+3' },
    { label: 'Отчёты', shortcut: 'Alt+4' },
    { label: 'divider', divider: true },
    { label: 'Свернуть боковую панель' },
    { label: 'Полноэкранный режим', shortcut: 'F11' },
  ],
  'Вставка': [
    { label: 'Строку выше' },
    { label: 'Строку ниже' },
    { label: 'divider', divider: true },
    { label: 'Столбец слева' },
    { label: 'Столбец справа' },
    { label: 'divider', divider: true },
    { label: 'Новый лист' },
  ],
  'Формат': [
    { label: 'Жирный', shortcut: 'Ctrl+B' },
    { label: 'Курсив', shortcut: 'Ctrl+I' },
    { label: 'Подчёркивание', shortcut: 'Ctrl+U' },
    { label: 'divider', divider: true },
    { label: 'Выравнивание по левому краю' },
    { label: 'Выравнивание по центру' },
    { label: 'Выравнивание по правому краю' },
    { label: 'divider', divider: true },
    { label: 'Условное форматирование...' },
  ],
  'Данные': [
    { label: 'Сортировка по возрастанию' },
    { label: 'Сортировка по убыванию' },
    { label: 'divider', divider: true },
    { label: 'Фильтр...' },
    { label: 'Снять фильтры' },
    { label: 'divider', divider: true },
    { label: 'Проверка данных...' },
    { label: 'Удалить дубликаты...' },
  ],
  'Справка': [
    { label: 'Документация' },
    { label: 'Горячие клавиши', shortcut: 'F1' },
    { label: 'divider', divider: true },
    { label: 'О программе' },
    { label: 'divider', divider: true },
    { label: 'Подключение к PostgreSQL...' },
  ],
};

// Конвертирует ответ API → TableFile
function rawToTableFile(r: api.RawTableList): TableFile {
  return {
    id: r.id, name: r.name, folderId: r.folderId,
    rowCount: r.rowCount, colCount: r.colCount,
    updatedAt: r.updatedAt, createdAt: r.createdAt,
  };
}

// Конвертирует ответ API → Folder
function rawToFolder(r: api.RawFolder): Folder {
  return { id: r.id, name: r.name, parentId: r.parent_id, createdAt: r.created_at };
}

// Конвертирует полную таблицу API → TableData
function rawToTableData(r: api.RawTableFull): TableData {
  return {
    id: r.id,
    name: r.name,
    primaryKey: r.primaryKey || undefined,
    columns: (r.columns || []).map(c => ({
      id: c.id, name: c.name,
      type: c.type as 'string' | 'number' | 'date' | 'boolean',
      isPrimaryKey: c.isPrimaryKey,
      isForeignKey: c.isForeignKey,
      referencesTable: c.referencesTable || undefined,
      referencesColumn: c.referencesColumn || undefined,
    })),
    sheets: (r.sheets || []).map(s => ({
      id: s.id, name: s.name,
      cells: Object.fromEntries(
        Object.entries(s.cells || {}).map(([addr, cell]) => [
          addr,
          {
            value: cell.value,
            formula: cell.formula || undefined,
            style: (cell.style && Object.keys(cell.style).length > 0) ? cell.style as Record<string, unknown> : undefined,
          },
        ])
      ),
      columnWidths: s.columnWidths || {},
      rowHeights: s.rowHeights || {},
      frozenRows: s.frozenRows || 0,
      frozenCols: s.frozenCols || 0,
    })),
  };
}

export default function Index() {
  const [section, setSection] = useState<Section>('tables');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tables, setTables] = useState<TableFile[]>([]);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [tableDataMap, setTableDataMap] = useState<Record<string, TableData>>({});
  const [relations, setRelations] = useState<Relation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('Только что');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [connConfig, setConnConfig] = useState<ConnectionConfig>(() => {
    try { return JSON.parse(localStorage.getItem('mysql_connection') || 'null') || DEFAULT_CONFIG; }
    catch { return DEFAULT_CONFIG; }
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие меню по клику вне
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Начальная загрузка всех данных из БД
  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [foldersRaw, tablesRaw, relationsRaw, reportsRaw] = await Promise.all([
        api.getFolders(),
        api.getTables(),
        api.getRelations(),
        api.getReports(),
      ]);
      setFolders(foldersRaw.map(rawToFolder));
      setTables(tablesRaw.map(rawToTableFile));

      // Строим tableDataMap из данных, пришедших со списком таблиц
      const tdMap: Record<string, TableData> = {};
      for (const raw of tablesRaw) {
        // Получаем полные данные для каждой таблицы
        const full = await api.getTable(raw.id);
        const td = rawToTableData(full);
        tdMap[raw.id] = td;
      }
      setTableDataMap(tdMap);
      if (Object.keys(tdMap).length > 0) {
        const first = Object.values(tdMap)[0];
        setTableData(first);
      }

      setRelations(relationsRaw.map(r => ({
        id: r.id, sourceTable: r.sourceTable, sourceColumn: r.sourceColumn,
        targetTable: r.targetTable, targetColumn: r.targetColumn,
        type: r.type as Relation['type'],
      })));

      setReports(reportsRaw.map(r => ({
        id: r.id, name: r.name, description: r.description,
        columns: r.columns as Report['columns'],
        filters: r.filters as Report['filters'],
        joinType: r.joinType as Report['joinType'],
        createdAt: r.createdAt,
      })));
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── HANDLERS ────────────────────────────────────────────────────────────

  const handleOpenTable = async (tableId: string) => {
    setOpenTableId(tableId);
    setSection('editor');
    if (!tableDataMap[tableId]) {
      try {
        const full = await api.getTable(tableId);
        const td = rawToTableData(full);
        setTableDataMap(prev => ({ ...prev, [tableId]: td }));
        setTableData(td);
      } catch (e) {
        console.error('Failed to load table:', e);
      }
    } else {
      setTableData(tableDataMap[tableId]);
    }
  };

  const handleTableChange = async (data: TableData) => {
    setTableData(data);
    setTableDataMap(prev => ({ ...prev, [data.id]: data }));
    setLastSaved('Сохранение...');
    try {
      // Сохраняем ячейки активного листа
      for (const sheet of data.sheets) {
        await api.saveCells({
          tableId: data.id,
          sheetId: sheet.id,
          cells: sheet.cells,
          columns: data.columns,
          sheets: data.sheets.map(s => ({
            id: s.id,
            columnWidths: s.columnWidths,
            rowHeights: s.rowHeights,
          })),
          rowCount: Object.keys(sheet.cells).length > 0
            ? Math.max(...Object.keys(sheet.cells).map(k => parseInt(k.replace(/\D/g, ''), 10)).filter(n => !isNaN(n)))
            : 0,
          colCount: data.columns.length,
          primaryKey: data.primaryKey,
        });
      }
      setLastSaved('Сохранено');
    } catch (e) {
      setLastSaved('Ошибка сохранения');
      console.error('Save error:', e);
    }
  };

  const handleImportedTable = async (file: TableFile, data: TableData) => {
    try {
      await api.createTable({
        id: file.id,
        name: file.name,
        folderId: file.folderId,
        rowCount: file.rowCount,
        colCount: file.colCount,
        columns: data.columns,
        sheets: data.sheets.map(s => ({
          id: s.id, name: s.name,
          columnWidths: s.columnWidths, rowHeights: s.rowHeights,
          cells: s.cells,
        })),
      });
      setTables(prev => [...prev, file]);
      setTableDataMap(prev => ({ ...prev, [file.id]: data }));
    } catch (e) {
      console.error('Import error:', e);
    }
  };

  const handleFoldersChange = async (newFolders: Folder[]) => {
    // Определяем новые папки (которых нет в текущем state)
    const currentIds = new Set(folders.map(f => f.id));
    const added = newFolders.filter(f => !currentIds.has(f.id));
    const removed = folders.filter(f => !newFolders.find(nf => nf.id === f.id));
    const updated = newFolders.filter(f => {
      const old = folders.find(of => of.id === f.id);
      return old && old.name !== f.name;
    });

    setFolders(newFolders);

    for (const f of added) {
      await api.createFolder({ id: f.id, name: f.name, parent_id: f.parentId, created_at: f.createdAt });
    }
    for (const f of removed) {
      await api.deleteFolder(f.id);
    }
    for (const f of updated) {
      await api.updateFolder(f.id, { name: f.name });
    }
  };

  const handleRelationsChange = async (newRelations: Relation[]) => {
    const currentIds = new Set(relations.map(r => r.id));
    const added = newRelations.filter(r => !currentIds.has(r.id));
    const removed = relations.filter(r => !newRelations.find(nr => nr.id === r.id));

    setRelations(newRelations);

    for (const r of added) {
      await api.createRelation(r);
    }
    for (const r of removed) {
      await api.deleteRelation(r.id);
    }
  };

  const handleReportsChange = async (newReports: Report[]) => {
    const currentIds = new Set(reports.map(r => r.id));
    const added = newReports.filter(r => !currentIds.has(r.id));
    const removed = reports.filter(r => !newReports.find(nr => nr.id === r.id));

    setReports(newReports);

    for (const r of added) {
      await api.createReport(r);
    }
    for (const r of removed) {
      await api.deleteReport(r.id);
    }
  };

  const handleMenuAction = (menu: string, item: string) => {
    setOpenMenu(null);
    if (menu === 'Файл' && item === 'Импорт Excel...') setSection('import');
    if (menu === 'Файл' && item === 'Экспорт...') setSection('import');
    if (menu === 'Вид') {
      if (item === 'Таблицы') setSection('tables');
      if (item === 'Редактор') setSection('editor');
      if (item === 'Связи') setSection('relations');
      if (item === 'Отчёты') setSection('reports');
      if (item === 'Свернуть боковую панель') setSidebarCollapsed(s => !s);
    }
    if (item === 'Подключение к PostgreSQL...') setConnectionOpen(true);
  };

  const handleSaveConnection = (cfg: ConnectionConfig) => {
    setConnConfig(cfg);
    localStorage.setItem('mysql_connection', JSON.stringify(cfg));
  };

  const openTable = tables.find(t => t.id === openTableId);
  const activeTableData = (openTableId && tableDataMap[openTableId]) || tableData;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Top header */}
      <header className="flex items-center h-10 bg-[#1e2332] px-3 gap-3 flex-shrink-0 relative z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
            <Icon name="Table2" size={14} className="text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">DataGrid</span>
          <span className="text-gray-500 text-xs ml-1">v1.0</span>
        </div>

        {/* Menu bar */}
        <div className="flex items-center gap-0.5 ml-2 relative" ref={menuRef}>
          {Object.keys(MENU_ITEMS).map(menuName => (
            <div key={menuName} className="relative">
              <button
                className={`text-gray-300 hover:text-white text-xs px-2.5 py-1 rounded transition-colors ${openMenu === menuName ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}
                onClick={() => setOpenMenu(openMenu === menuName ? null : menuName)}
              >
                {menuName}
              </button>
              {openMenu === menuName && (
                <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-[100] min-w-[200px] animate-fade-in">
                  {MENU_ITEMS[menuName].map((item, i) =>
                    item.divider ? (
                      <div key={i} className="border-t border-gray-100 my-1" />
                    ) : (
                      <button key={i}
                        className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-gray-700 hover:bg-green-50 hover:text-green-800 text-left transition-colors"
                        onClick={() => handleMenuAction(menuName, item.label)}>
                        <span>{item.label}</span>
                        {item.shortcut && <span className="text-gray-400 ml-8">{item.shortcut}</span>}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* DB connection button */}
        <button onClick={() => setConnectionOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors border border-transparent hover:border-white/20 hover:bg-white/10"
          title="Настройка подключения к PostgreSQL">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connConfig.database ? 'bg-blue-400' : 'bg-yellow-400'} animate-pulse`} />
          <span className={connConfig.database ? 'text-blue-300' : 'text-yellow-300'}>
            {connConfig.database ? `${connConfig.host}/${connConfig.database}` : 'Не подключено'}
          </span>
          <Icon name="Settings2" size={11} className="text-gray-400" />
        </button>

        {/* Auto-save indicator */}
        <div className="flex items-center gap-1 text-xs text-gray-400 border-l border-gray-600 pl-3 ml-1">
          <Icon name="Cloud" size={12} className="text-green-400" />
          <span>Сохранено: {lastSaved}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className={`flex flex-col bg-[#252b3d] transition-all duration-200 flex-shrink-0 ${sidebarCollapsed ? 'w-12' : 'w-52'}`}>
          <div className={`flex items-center h-10 border-b border-[#1e2332] ${sidebarCollapsed ? 'justify-center' : 'px-3 justify-between'}`}>
            {!sidebarCollapsed && <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest">Навигация</span>}
            <button className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Развернуть' : 'Свернуть'}>
              <Icon name={sidebarCollapsed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={14} />
            </button>
          </div>

          <nav className="flex-1 py-2 space-y-0.5 px-1.5">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-left transition-all ${section === item.id ? 'bg-green-700 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                title={sidebarCollapsed ? item.label : ''}>
                <Icon name={item.icon as 'Table2'} size={15} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <div className="text-xs font-medium leading-tight">{item.label}</div>
                    <div className="text-[10px] text-gray-400 leading-tight truncate">{item.desc}</div>
                  </div>
                )}
              </button>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="p-3 border-t border-[#1e2332]">
              <button onClick={() => setConnectionOpen(true)} className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connConfig.database ? 'bg-blue-400' : 'bg-yellow-400'}`} />
                <div className="min-w-0">
                  <div className="text-white text-xs font-medium truncate">
                    {connConfig.database ? connConfig.database : 'PostgreSQL'}
                  </div>
                  <div className="text-gray-400 text-[10px] truncate">
                    {connConfig.database ? `${connConfig.host}:${connConfig.port}` : 'Не подключено'}
                  </div>
                </div>
                <Icon name="Settings2" size={12} className="text-gray-500 flex-shrink-0 ml-auto" />
              </button>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-2">
                <Icon name="Database" size={10} />
                <span>{tables.length} таблиц · {folders.length} папок</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-b text-xs text-gray-500 flex-shrink-0">
            <Icon name="Home" size={12} />
            <Icon name="ChevronRight" size={12} className="text-gray-300" />
            <span className="font-medium text-gray-700">{NAV_ITEMS.find(n => n.id === section)?.label}</span>
            {section === 'editor' && openTable && (
              <>
                <Icon name="ChevronRight" size={12} className="text-gray-300" />
                <span className="flex items-center gap-1 text-green-700">
                  <Icon name="FileSpreadsheet" size={11} className="text-green-600" />
                  {openTable.name}
                </span>
              </>
            )}
            <div className="ml-auto flex items-center gap-3">
              {loading && <span className="text-gray-400 flex items-center gap-1"><div className="w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Загрузка...</span>}
              {loadError && <span className="text-red-500 text-xs" title={loadError}>Ошибка загрузки</span>}
              {section === 'editor' && (
                <>
                  <span className="flex items-center gap-1 text-green-600">
                    <Icon name="CheckCircle2" size={11} />
                    Синхронизировано
                  </span>
                  <span className="text-gray-300">|</span>
                </>
              )}
              <span className="text-gray-400">
                {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {section === 'tables' && (
              <TablesSection
                folders={folders}
                tables={tables}
                onOpenTable={handleOpenTable}
                onFoldersChange={handleFoldersChange}
                onImportClick={() => setSection('import')}
              />
            )}
            {section === 'editor' && activeTableData && (
              <TableEditor
                tableData={activeTableData}
                onTableChange={handleTableChange}
                onlineUsers={[]}
              />
            )}
            {section === 'editor' && !activeTableData && !loading && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Icon name="Table2" size={40} className="mx-auto mb-3 opacity-20" />
                  <div className="text-sm">Выберите таблицу из раздела «Таблицы»</div>
                </div>
              </div>
            )}
            {section === 'relations' && (
              <RelationsSection
                relations={relations}
                tables={tables}
                tableData={activeTableData || { id: '', name: '', sheets: [], columns: [] }}
                tableDataMap={tableDataMap}
                onRelationsChange={handleRelationsChange}
                onTableDataChange={handleTableChange}
              />
            )}
            {section === 'reports' && (
              <ReportsSection
                reports={reports}
                tables={tables}
                relations={relations}
                tableDataMap={tableDataMap}
                onReportsChange={handleReportsChange}
              />
            )}
            {section === 'import' && (
              <ImportExportSection
                tables={tables}
                tableDataMap={tableDataMap}
                onImportedTable={handleImportedTable}
              />
            )}
          </div>
        </main>
      </div>

      {/* Status bar */}
      <footer className="flex items-center gap-4 px-4 h-6 bg-[#217346] text-white text-[11px] flex-shrink-0">
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          onClick={() => setConnectionOpen(true)} title="Настройка подключения к PostgreSQL">
          <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-300' : connConfig.database ? 'bg-blue-300 animate-pulse' : 'bg-yellow-300'}`} />
          <span>{loading ? 'Загрузка...' : connConfig.database ? `PostgreSQL · ${connConfig.host}/${connConfig.database}` : 'PostgreSQL · платформа'}</span>
        </button>
        <span className="text-green-200">·</span>
        <span>{tables.length} таблиц · {folders.length} папок</span>
        <div className="ml-auto flex items-center gap-3">
          <span>Сохранено: {lastSaved}</span>
        </div>
      </footer>

      <ConnectionDialog
        open={connectionOpen}
        onClose={() => setConnectionOpen(false)}
        config={connConfig}
        onSave={handleSaveConnection}
      />
    </div>
  );
}