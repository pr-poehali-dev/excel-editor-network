import { useRef, useEffect, useState } from 'react';
import { Report } from '@/types';
import Icon from '@/components/ui/icon';
import { exportReportToXLSX, exportToCSV, exportToJSON, printTable } from '@/lib/excel';
import { sampleData } from './reportsTypes';

interface Props {
  report: Report;
  showResults: boolean;
  onToggleResults: () => void;
}

export default function ReportView({ report, showResults, onToggleResults }: Props) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const exportReport = (fmt: 'xlsx' | 'csv' | 'json') => {
    setExportMenuOpen(false);
    const headers = report.columns.map(c => c.alias || c.columnName);
    const rows = sampleData.map(r => Object.values(r) as string[]);
    if (fmt === 'xlsx') exportReportToXLSX(report.name, headers, sampleData);
    else if (fmt === 'csv') exportToCSV(headers, rows, report.name);
    else exportToJSON({ report: report.name, columns: headers, rows: sampleData }, report.name);
  };

  const handlePrint = () => {
    const headers = report.columns.map(c => c.alias || c.columnName);
    const rows = sampleData.map(r => Object.values(r) as string[]);
    printTable(report.name, headers, rows, 'landscape');
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{report.name}</h2>
          {report.description && <p className="text-sm text-gray-500 mt-1">{report.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{report.joinType || 'LEFT'} JOIN</span>
            <span className="text-xs text-gray-400">{report.columns.length} столбцов</span>
            {report.filters.length > 0 && <span className="text-xs text-gray-400">{report.filters.length} фильтров</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onToggleResults}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
            <Icon name={showResults ? 'EyeOff' : 'Play'} size={14} />
            {showResults ? 'Скрыть' : 'Выполнить'}
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button className="flex items-center gap-2 px-4 py-2 border text-sm rounded hover:bg-gray-50 transition-colors"
              onClick={() => setExportMenuOpen(p => !p)}>
              <Icon name="Download" size={14} />Экспорт<Icon name="ChevronDown" size={12} />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[190px] animate-fade-in">
                {([
                  { fmt: 'xlsx', icon: 'FileSpreadsheet', label: 'Excel (.xlsx)', cls: 'text-green-600' },
                  { fmt: 'csv', icon: 'FileText', label: 'CSV (UTF-8)', cls: 'text-blue-500' },
                  { fmt: 'json', icon: 'Braces', label: 'JSON', cls: 'text-purple-500' },
                ] as const).map(({ fmt, icon, label, cls }) => (
                  <button key={fmt} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 text-left"
                    onClick={() => exportReport(fmt)}>
                    <Icon name={icon} size={14} className={cls} />{label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border text-sm rounded hover:bg-gray-50 transition-colors">
            <Icon name="Printer" size={14} />Печать
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Столбцы</div>
        <div className="flex flex-wrap gap-2">
          {report.columns.map((col, i) => (
            <div key={i} className="flex items-center gap-1 bg-gray-50 border px-3 py-1.5 rounded text-sm">
              <span className="text-green-600 text-xs">{col.tableName}.</span>
              <span className="font-medium">{col.columnName}</span>
              {col.alias && <span className="text-gray-400 text-xs ml-1">→ {col.alias}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      {report.filters.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Фильтры</div>
          <div className="flex flex-wrap gap-2">
            {report.filters.map((f, i) => (
              <span key={i} className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-1 rounded">
                {f.columnId} {f.operator} '{f.value}'
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SQL */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">SQL-запрос</div>
        <div className="bg-gray-900 text-green-300 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <div><span className="text-blue-400">SELECT</span></div>
          {report.columns.map((col, i) => (
            <div key={i} className="ml-4">{`\`${col.tableName}\`.\`${col.columnName}\`${i < report.columns.length - 1 ? ',' : ''}`}</div>
          ))}
          <div><span className="text-blue-400">FROM</span> <span className="text-yellow-300">{report.columns[0]?.tableName}</span></div>
          {[...new Set(report.columns.slice(1).map(c => c.tableName))].filter(t => t !== report.columns[0]?.tableName).map((tbl, i) => (
            <div key={i} className="ml-2">
              <span className="text-blue-400">{report.joinType || 'LEFT'} JOIN</span>{' '}
              <span className="text-yellow-300">{tbl}</span>{' '}
              <span className="text-blue-400">ON</span> ...
            </div>
          ))}
          {report.filters.length > 0 && (
            <>
              <div><span className="text-blue-400">WHERE</span></div>
              {report.filters.map((f, i) => (
                <div key={i} className="ml-4">{`\`${f.columnId}\` ${f.operator} '${f.value}'${i < report.filters.length - 1 ? ' AND' : ''}`}</div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="animate-fade-in">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Результаты · {sampleData.length} строк (демо-данные)
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {Object.keys(sampleData[0]).map(k => (
                      <th key={k} className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((row, i) => (
                    <tr key={i} className={`border-b last:border-0 hover:bg-blue-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-gray-700">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
