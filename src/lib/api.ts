/**
 * API-клиент для работы с бэкендом.
 * Все данные хранятся в PostgreSQL базе платформы.
 */

const BASE_URL = 'http://localhost:8000';

async function request<T>(
  method: string,
  resource: string,
  params: Record<string, string> = {},
  body?: unknown
): Promise<T> {
  const url = new URL(BASE_URL);
  if (resource) url.searchParams.set('resource', resource);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function action<T>(act: string, body?: unknown): Promise<T> {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', act);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ─── SEED ────────────────────────────────────────────────────────────────────
export const seedData = () => action('seed');

// ─── FOLDERS ─────────────────────────────────────────────────────────────────
export const getFolders = () => request<RawFolder[]>('GET', 'folders');
export const createFolder = (body: Partial<RawFolder>) => request<RawFolder>('POST', 'folders', {}, body);
export const updateFolder = (id: string, body: Partial<RawFolder>) => request<RawFolder>('PUT', 'folders', { id }, body);
export const deleteFolder = (id: string) => request<{ deleted: string }>('DELETE', 'folders', { id });

// ─── TABLES ──────────────────────────────────────────────────────────────────
export const getTables = () => request<RawTableList[]>('GET', 'tables');
export const getTable = (id: string) => request<RawTableFull>('GET', 'tables', { id });
export const createTable = (body: unknown) => request<{ id: string }>('POST', 'tables', {}, body);
export const updateTable = (id: string, body: unknown) => request<{ updated: string }>('PUT', 'tables', { id }, body);
export const deleteTable = (id: string) => request<{ deleted: string }>('DELETE', 'tables', { id });

// ─── CELLS ───────────────────────────────────────────────────────────────────
export const getCells = (sheetId: string) => request<Record<string, RawCell>>('GET', 'cells', { sheet_id: sheetId });
export const saveCells = (body: unknown) => request<{ saved: number }>('POST', 'cells', {}, body);

// ─── RELATIONS ───────────────────────────────────────────────────────────────
export const getRelations = () => request<RawRelation[]>('GET', 'relations');
export const createRelation = (body: unknown) => request<{ id: string }>('POST', 'relations', {}, body);
export const deleteRelation = (id: string) => request<{ deleted: string }>('DELETE', 'relations', { id });

// ─── REPORTS ─────────────────────────────────────────────────────────────────
export const getReports = () => request<RawReport[]>('GET', 'reports');
export const createReport = (body: unknown) => request<{ id: string }>('POST', 'reports', {}, body);
export const updateReport = (id: string, body: unknown) => request<{ updated: string }>('PUT', 'reports', { id }, body);
export const deleteReport = (id: string) => request<{ deleted: string }>('DELETE', 'reports', { id });

// ─── RAW TYPES ────────────────────────────────────────────────────────────────
export interface RawFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface RawTableList {
  id: string;
  name: string;
  folderId: string | null;
  rowCount: number;
  colCount: number;
  primaryKey: string | null;
  updatedAt: string;
  createdAt: string;
  columns: RawColumn[];
  sheets: RawSheetMeta[];
}

export interface RawTableFull {
  id: string;
  name: string;
  primaryKey: string | null;
  columns: RawColumn[];
  sheets: RawSheetFull[];
}

export interface RawColumn {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable: string | null;
  referencesColumn: string | null;
}

export interface RawSheetMeta {
  id: string;
  name: string;
  sort_order: number;
  columnWidths: Record<string, number>;
  rowHeights: Record<string, number>;
}

export interface RawSheetFull {
  id: string;
  name: string;
  cells: Record<string, RawCell>;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  frozenRows: number;
  frozenCols: number;
}

export interface RawCell {
  value: string | number | null;
  formula?: string | null;
  style?: Record<string, unknown>;
}

export interface RawRelation {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  type: string;
}

export interface RawReport {
  id: string;
  name: string;
  description?: string;
  columns: unknown[];
  filters: unknown[];
  joinType: string;
  createdAt: string;
}