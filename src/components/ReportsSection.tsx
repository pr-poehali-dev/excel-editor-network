import { useState } from 'react';
import { Report, TableFile, Relation } from '@/types';
import Icon from '@/components/ui/icon';
import { BuilderState, ReportsTableData, defaultBuilder } from './reports/reportsTypes';
import ReportsSidebar from './reports/ReportsSidebar';
import ReportBuilder from './reports/ReportBuilder';
import ReportView from './reports/ReportView';

interface Props {
  reports: Report[];
  tables: TableFile[];
  relations: Relation[];
  tableDataMap: Record<string, ReportsTableData>;
  onReportsChange: (r: Report[]) => void;
}

export default function ReportsSection({ reports, tables, tableDataMap, onReportsChange }: Props) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(reports[0] || null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [b, setB] = useState<BuilderState>(defaultBuilder());

  const deleteReport = (id: string) => {
    onReportsChange(reports.filter(r => r.id !== id));
    if (selectedReport?.id === id) setSelectedReport(null);
  };

  const saveReport = () => {
    if (!b.name.trim() || !b.columns.length) return;
    const report: Report = {
      id: `rep${Date.now()}`,
      name: b.name,
      description: b.description,
      columns: b.columns,
      filters: b.filters,
      joinType: b.joinType === 'FULL' ? 'LEFT' : b.joinType,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onReportsChange([...reports, report]);
    setB(defaultBuilder());
    setShowBuilder(false);
    setSelectedReport(report);
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <ReportsSidebar
        reports={reports}
        selectedReport={selectedReport}
        showBuilder={showBuilder}
        onSelect={report => { setSelectedReport(report); setShowBuilder(false); setShowResults(false); }}
        onCreate={() => { setShowBuilder(true); setSelectedReport(null); setB(defaultBuilder()); }}
        onDelete={deleteReport}
      />

      <div className="flex-1 overflow-y-auto">
        {showBuilder ? (
          <ReportBuilder
            b={b}
            setB={setB}
            tables={tables}
            tableDataMap={tableDataMap}
            onSave={saveReport}
            onCancel={() => setShowBuilder(false)}
          />
        ) : selectedReport ? (
          <ReportView
            report={selectedReport}
            showResults={showResults}
            onToggleResults={() => setShowResults(p => !p)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <Icon name="BarChart3" size={40} className="mx-auto mb-3 opacity-20" />
              <div className="text-sm">Выберите отчёт слева или создайте новый</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}