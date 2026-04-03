import { useState, useRef, useEffect } from 'react';
import { Section, TableFile } from '@/types';
import { mockFolders, mockTables, mockTableData, mockRelations, mockReports, mockOnlineUsers } from '@/data/mockData';
import TablesSection from '@/components/TablesSection';
import TableEditor from '@/components/TableEditor';
import RelationsSection from '@/components/RelationsSection';
import ReportsSection from '@/components/ReportsSection';
import ImportExportSection from '@/components/ImportExportSection';
import Icon from '@/components/ui/icon';
import type { Folder, TableData, Relation, Report } from '@/types';

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
  ],
};

export default function Index() {
  const [section, setSection] = useState<Section>('tables');
  const [folders, setFolders] = useState<Folder[]>(mockFolders);
  const [tables, setTables] = useState<TableFile[]>(mockTables);
  const [tableData, setTableData] = useState<TableData>(mockTableData);
  const [relations, setRelations] = useState<Relation[]>(mockRelations);
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('Только что');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTableChange = (data: TableData) => {
    setTableData(data);
    setLastSaved('Только что');
  };

  const handleOpenTable = (tableId: string) => {
    setOpenTableId(tableId);
    setSection('editor');
  };

  const handleImportedTable = (file: TableFile) => {
    setTables(prev => [...prev, file]);
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
  };

  const openTable = tables.find(t => t.id === openTableId);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Top header bar */}
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
                      <button
                        key={i}
                        className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-gray-700 hover:bg-green-50 hover:text-green-800 text-left transition-colors"
                        onClick={() => handleMenuAction(menuName, item.label)}
                      >
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

        {/* Online users */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {mockOnlineUsers.map(u => (
              <div
                key={u.id}
                className="w-6 h-6 rounded-full border-2 border-[#1e2332] flex items-center justify-center text-white text-[10px] font-bold cursor-default"
                style={{ backgroundColor: u.color }}
                title={`${u.name} — активен`}
              >
                {u.name.charAt(0)}
              </div>
            ))}
          </div>
          <span className="text-gray-400 text-xs">{mockOnlineUsers.length} онлайн</span>
        </div>

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
            <button
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Развернуть' : 'Свернуть'}
            >
              <Icon name={sidebarCollapsed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={14} />
            </button>
          </div>

          <nav className="flex-1 py-2 space-y-0.5 px-1.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-left transition-all ${section === item.id ? 'bg-green-700 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                title={sidebarCollapsed ? item.label : ''}
              >
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
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white text-[10px] font-bold">В</div>
                <div>
                  <div className="text-white text-xs font-medium">Вы</div>
                  <div className="text-gray-400 text-[10px]">Администратор</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <Icon name="Database" size={10} />
                <span>MySQL · {tables.length} таблиц · {folders.length} папок</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
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
                onFoldersChange={setFolders}
                onImportClick={() => setSection('import')}
              />
            )}
            {section === 'editor' && (
              <TableEditor
                tableData={tableData}
                onTableChange={handleTableChange}
                onlineUsers={mockOnlineUsers}
              />
            )}
            {section === 'relations' && (
              <RelationsSection
                relations={relations}
                tables={tables}
                tableData={tableData}
                onRelationsChange={setRelations}
                onTableDataChange={setTableData}
              />
            )}
            {section === 'reports' && (
              <ReportsSection
                reports={reports}
                tables={tables}
                relations={relations}
                onReportsChange={setReports}
              />
            )}
            {section === 'import' && (
              <ImportExportSection
                tables={tables}
                onImportedTable={handleImportedTable}
              />
            )}
          </div>
        </main>
      </div>

      {/* Status bar */}
      <footer className="flex items-center gap-4 px-4 h-6 bg-[#217346] text-white text-[11px] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse"></div>
          <span>Подключено · MySQL</span>
        </div>
        <span className="text-green-200">·</span>
        <span>{tables.length} таблиц в базе</span>
        <span className="text-green-200">·</span>
        <span>{mockOnlineUsers.length} пользователей онлайн</span>
        <div className="ml-auto flex items-center gap-3">
          <span>WebSocket: активен</span>
          <span className="text-green-200">·</span>
          <span>Режим: совместный</span>
        </div>
      </footer>
    </div>
  );
}
