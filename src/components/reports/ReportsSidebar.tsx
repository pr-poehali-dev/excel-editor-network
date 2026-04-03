import { Report } from '@/types';
import Icon from '@/components/ui/icon';

interface Props {
  reports: Report[];
  selectedReport: Report | null;
  showBuilder: boolean;
  onSelect: (report: Report) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export default function ReportsSidebar({ reports, selectedReport, showBuilder, onSelect, onCreate, onDelete }: Props) {
  return (
    <div className="w-60 border-r flex flex-col bg-gray-50 flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Отчёты</span>
        <button
          className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 px-1.5 py-0.5 rounded hover:bg-green-50"
          onClick={onCreate}
        >
          <Icon name="Plus" size={12} />Создать
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {reports.map(report => (
          <div
            key={report.id}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer group hover:bg-blue-50 transition-colors ${selectedReport?.id === report.id && !showBuilder ? 'bg-blue-100' : ''}`}
            onClick={() => onSelect(report)}
          >
            <Icon name="BarChart3" size={14} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{report.name}</div>
              <div className="text-xs text-gray-400">{report.columns.length} столбцов</div>
            </div>
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-600"
              onClick={e => { e.stopPropagation(); onDelete(report.id); }}
            >
              <Icon name="X" size={12} />
            </button>
          </div>
        ))}
        {!reports.length && <div className="text-center py-8 text-xs text-gray-400 px-3">Нет отчётов.</div>}
      </div>
    </div>
  );
}
