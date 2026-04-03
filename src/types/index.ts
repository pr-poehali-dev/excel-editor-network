export type Section = 'tables' | 'editor' | 'relations' | 'reports' | 'import';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface TableFile {
  id: string;
  name: string;
  folderId: string | null;
  rowCount: number;
  colCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  format?: string;
}

export interface Cell {
  value: string | number | null;
  formula?: string;
  style?: CellStyle;
}

export interface SheetData {
  id: string;
  name: string;
  cells: Record<string, Cell>;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  frozenRows?: number;
  frozenCols?: number;
}

export interface TableData {
  id: string;
  name: string;
  sheets: SheetData[];
  primaryKey?: string;
  columns: ColumnDef[];
}

export interface ColumnDef {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencesTable?: string;
  referencesColumn?: string;
}

export interface Relation {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface ReportColumn {
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
  alias?: string;
}

export interface ReportFilter {
  tableId: string;
  columnId: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
  joinType?: 'INNER' | 'LEFT' | 'RIGHT';
  createdAt: string;
}

export interface OnlineUser {
  id: string;
  name: string;
  color: string;
  activeCell?: string;
  activeTable?: string;
}
