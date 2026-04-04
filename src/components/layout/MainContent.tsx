import { Section, TableFile, TableData, Folder, Relation, Report } from '@/types';
import TablesSection from '@/components/TablesSection';
import TableEditor from '@/components/TableEditor';
import RelationsSection from '@/components/RelationsSection';
import ReportsSection from '@/components/ReportsSection';
import ImportExportSection from '@/components/ImportExportSection';
import Icon from '@/components/ui/icon';

const NAV_LABELS: Record<Section, string> = {
  tables: 'Таблицы',
  editor: 'Редактор',
  relations: 'Связи',
  reports: 'Отчёты',
  import: 'Импорт/Экспорт',
};

interface Props {
  section: Section;
  setSection: (s: Section) => void;
  loading: boolean;
  loadError: string;
  openTable: TableFile | undefined;
  activeTableData: TableData | null | false;
  folders: Folder[];
  tables: TableFile[];
  tableDataMap: Record<string, TableData>;
  relations: Relation[];
  reports: Report[];
  onOpenTable: (id: string) => void;
  onFoldersChange: (folders: Folder[]) => void;
  onTableChange: (data: TableData) => void;
  onImportedTable: (file: TableFile, data: TableData) => void;
  onRelationsChange: (relations: Relation[]) => void;
  onReportsChange: (reports: Report[]) => void;
}

export default function MainContent({
  section, setSection, loading, loadError,
  openTable, activeTableData,
  folders, tables, tableDataMap, relations, reports,
  onOpenTable, onFoldersChange, onTableChange, onImportedTable,
  onRelationsChange, onReportsChange,
}: Props) {
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b text-xs text-gray-500 flex-shrink-0">
        <Icon name="Home" size={12} />
        <Icon name="ChevronRight" size={12} className="text-gray-300" />
        <span className="font-medium text-gray-700">{NAV_LABELS[section]}</span>
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
          {loading && (
            <span className="text-gray-400 flex items-center gap-1">
              <div className="w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Загрузка...
            </span>
          )}
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
            onOpenTable={onOpenTable}
            onFoldersChange={onFoldersChange}
            onImportClick={() => setSection('import')}
          />
        )}
        {section === 'editor' && activeTableData && (
          <TableEditor
            tableData={activeTableData}
            onTableChange={onTableChange}
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
            onRelationsChange={onRelationsChange}
            onTableDataChange={onTableChange}
          />
        )}
        {section === 'reports' && (
          <ReportsSection
            reports={reports}
            tables={tables}
            relations={relations}
            tableDataMap={tableDataMap}
            onReportsChange={onReportsChange}
          />
        )}
        {section === 'import' && (
          <ImportExportSection
            tables={tables}
            tableDataMap={tableDataMap}
            onImportedTable={onImportedTable}
          />
        )}
      </div>
    </main>
  );
}
