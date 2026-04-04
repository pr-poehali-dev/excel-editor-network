import { Section } from '@/types';
import { ConnectionConfig } from '@/components/ConnectionDialog';
import Icon from '@/components/ui/icon';

const NAV_ITEMS: { id: Section; label: string; icon: string; desc: string }[] = [
  { id: 'tables', label: 'Таблицы', icon: 'LayoutGrid', desc: 'Управление файлами и папками' },
  { id: 'editor', label: 'Редактор', icon: 'Table2', desc: 'Редактирование ячеек' },
  { id: 'relations', label: 'Связи', icon: 'GitBranch', desc: 'Связи и ключи' },
  { id: 'reports', label: 'Отчёты', icon: 'BarChart3', desc: 'Конструктор запросов' },
  { id: 'import', label: 'Импорт/Экспорт', icon: 'ArrowLeftRight', desc: 'Загрузка и выгрузка' },
];

interface Props {
  section: Section;
  setSection: (s: Section) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  connConfig: ConnectionConfig;
  onConnectionClick: () => void;
  tablesCount: number;
  foldersCount: number;
}

export default function AppSidebar({
  section, setSection, collapsed, setCollapsed,
  connConfig, onConnectionClick, tablesCount, foldersCount,
}: Props) {
  return (
    <aside className={`flex flex-col bg-[#252b3d] transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-12' : 'w-52'}`}>
      <div className={`flex items-center h-10 border-b border-[#1e2332] ${collapsed ? 'justify-center' : 'px-3 justify-between'}`}>
        {!collapsed && <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest">Навигация</span>}
        <button className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Развернуть' : 'Свернуть'}>
          <Icon name={collapsed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={14} />
        </button>
      </div>

      <nav className="flex-1 py-2 space-y-0.5 px-1.5">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setSection(item.id)}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-left transition-all ${section === item.id ? 'bg-green-700 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
            title={collapsed ? item.label : ''}>
            <Icon name={item.icon as 'Table2'} size={15} className="flex-shrink-0" />
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-medium leading-tight">{item.label}</div>
                <div className="text-[10px] text-gray-400 leading-tight truncate">{item.desc}</div>
              </div>
            )}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-[#1e2332]">
          <button onClick={onConnectionClick} className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
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
            <span>{tablesCount} таблиц · {foldersCount} папок</span>
          </div>
        </div>
      )}
    </aside>
  );
}

export { NAV_ITEMS };
