import { useState, useEffect, useCallback } from 'react';
import { Section, TableFile, Folder, TableData, Relation, Report } from '@/types';
import { ConnectionConfig, DEFAULT_CONFIG } from '@/components/ConnectionDialog';
import ConnectionDialog from '@/components/ConnectionDialog';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import MainContent from '@/components/layout/MainContent';
import AppStatusBar from '@/components/layout/AppStatusBar';
import * as api from '@/lib/api';

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

      const tdMap: Record<string, TableData> = {};
      for (const raw of tablesRaw) {
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
      <AppHeader
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        onMenuAction={handleMenuAction}
        connConfig={connConfig}
        lastSaved={lastSaved}
        onConnectionClick={() => setConnectionOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          section={section}
          setSection={setSection}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          connConfig={connConfig}
          onConnectionClick={() => setConnectionOpen(true)}
          tablesCount={tables.length}
          foldersCount={folders.length}
        />

        <MainContent
          section={section}
          setSection={setSection}
          loading={loading}
          loadError={loadError}
          openTable={openTable}
          activeTableData={activeTableData}
          folders={folders}
          tables={tables}
          tableDataMap={tableDataMap}
          relations={relations}
          reports={reports}
          onOpenTable={handleOpenTable}
          onFoldersChange={handleFoldersChange}
          onTableChange={handleTableChange}
          onImportedTable={handleImportedTable}
          onRelationsChange={handleRelationsChange}
          onReportsChange={handleReportsChange}
        />
      </div>

      <AppStatusBar
        loading={loading}
        connConfig={connConfig}
        tablesCount={tables.length}
        foldersCount={folders.length}
        lastSaved={lastSaved}
        onConnectionClick={() => setConnectionOpen(true)}
      />

      <ConnectionDialog
        open={connectionOpen}
        onClose={() => setConnectionOpen(false)}
        config={connConfig}
        onSave={handleSaveConnection}
      />
    </div>
  );
}
