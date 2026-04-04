import { useRef, useEffect } from 'react';
import { Section } from '@/types';
import { ConnectionConfig } from '@/components/ConnectionDialog';
import Icon from '@/components/ui/icon';

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

interface Props {
  openMenu: string | null;
  setOpenMenu: (v: string | null) => void;
  onMenuAction: (menu: string, item: string) => void;
  connConfig: ConnectionConfig;
  lastSaved: string;
  onConnectionClick: () => void;
}

export default function AppHeader({
  openMenu, setOpenMenu, onMenuAction, connConfig, lastSaved, onConnectionClick,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [setOpenMenu]);

  return (
    <header className="flex items-center h-10 bg-[#1e2332] px-3 gap-3 flex-shrink-0 relative z-50">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
          <Icon name="Table2" size={14} className="text-white" />
        </div>
        <span className="text-white font-semibold text-sm tracking-tight">DataGrid</span>
        <span className="text-gray-500 text-xs ml-1">v1.0</span>
      </div>

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
                      onClick={() => onMenuAction(menuName, item.label)}>
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

      <button onClick={onConnectionClick}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors border border-transparent hover:border-white/20 hover:bg-white/10"
        title="Настройка подключения к PostgreSQL">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connConfig.database ? 'bg-blue-400' : 'bg-yellow-400'} animate-pulse`} />
        <span className={connConfig.database ? 'text-blue-300' : 'text-yellow-300'}>
          {connConfig.database ? `${connConfig.host}/${connConfig.database}` : 'Не подключено'}
        </span>
        <Icon name="Settings2" size={11} className="text-gray-400" />
      </button>

      <div className="flex items-center gap-1 text-xs text-gray-400 border-l border-gray-600 pl-3 ml-1">
        <Icon name="Cloud" size={12} className="text-green-400" />
        <span>Сохранено: {lastSaved}</span>
      </div>
    </header>
  );
}

export { MENU_ITEMS };
export type { Section };
