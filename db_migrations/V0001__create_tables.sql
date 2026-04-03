CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS table_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  folder_id TEXT,
  row_count INTEGER DEFAULT 0,
  col_count INTEGER DEFAULT 0,
  primary_key_col TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sheets (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  name TEXT NOT NULL,
  column_widths JSONB DEFAULT '{}',
  row_heights JSONB DEFAULT '{}',
  frozen_rows INTEGER DEFAULT 0,
  frozen_cols INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cells (
  sheet_id TEXT NOT NULL,
  cell_addr TEXT NOT NULL,
  value TEXT,
  formula TEXT,
  style JSONB DEFAULT '{}',
  PRIMARY KEY (sheet_id, cell_addr)
);

CREATE TABLE IF NOT EXISTS column_defs (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  name TEXT NOT NULL,
  col_type TEXT NOT NULL DEFAULT 'string',
  is_primary_key BOOLEAN DEFAULT FALSE,
  is_foreign_key BOOLEAN DEFAULT FALSE,
  references_table TEXT,
  references_column TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS table_relations (
  id TEXT PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_column TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_column TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'one-to-many',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  columns_def JSONB DEFAULT '[]',
  filters JSONB DEFAULT '[]',
  join_type TEXT DEFAULT 'LEFT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
