import { ConnectionConfig } from '@/components/ConnectionDialog';

interface Props {
  loading: boolean;
  connConfig: ConnectionConfig;
  tablesCount: number;
  foldersCount: number;
  lastSaved: string;
  onConnectionClick: () => void;
}

export default function AppStatusBar({
  loading, connConfig, tablesCount, foldersCount, lastSaved, onConnectionClick,
}: Props) {
  return (
    <footer className="flex items-center gap-4 px-4 h-6 bg-[#217346] text-white text-[11px] flex-shrink-0">
      <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        onClick={onConnectionClick} title="Настройка подключения к PostgreSQL">
        <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-300' : connConfig.database ? 'bg-blue-300 animate-pulse' : 'bg-yellow-300'}`} />
        <span>{loading ? 'Загрузка...' : connConfig.database ? `PostgreSQL · ${connConfig.host}/${connConfig.database}` : 'PostgreSQL · платформа'}</span>
      </button>
      <span className="text-green-200">·</span>
      <span>{tablesCount} таблиц · {foldersCount} папок</span>
      <div className="ml-auto flex items-center gap-3">
        <span>Сохранено: {lastSaved}</span>
      </div>
    </footer>
  );
}
