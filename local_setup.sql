-- Создание базы данных и таблиц для локального запуска
-- Выполнить в pgAdmin 4: открыть Query Tool для базы excel_editor и запустить этот файл

CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(64) REFERENCES folders(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS table_files (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    folder_id VARCHAR(64) REFERENCES folders(id) ON DELETE SET NULL,
    row_count INTEGER DEFAULT 0,
    col_count INTEGER DEFAULT 0,
    primary_key_col VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS column_defs (
    id VARCHAR(64) PRIMARY KEY,
    table_id VARCHAR(64) NOT NULL REFERENCES table_files(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    col_type VARCHAR(64) DEFAULT 'string',
    is_primary_key BOOLEAN DEFAULT FALSE,
    is_foreign_key BOOLEAN DEFAULT FALSE,
    references_table VARCHAR(64),
    references_column VARCHAR(64),
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sheets (
    id VARCHAR(64) PRIMARY KEY,
    table_id VARCHAR(64) NOT NULL REFERENCES table_files(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Лист1',
    column_widths JSONB DEFAULT '{}',
    row_heights JSONB DEFAULT '{}',
    frozen_rows INTEGER DEFAULT 0,
    frozen_cols INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cells (
    id SERIAL PRIMARY KEY,
    sheet_id VARCHAR(64) NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    cell_addr VARCHAR(16) NOT NULL,
    value TEXT,
    formula TEXT,
    style JSONB DEFAULT '{}',
    UNIQUE(sheet_id, cell_addr)
);

CREATE TABLE IF NOT EXISTS table_relations (
    id VARCHAR(64) PRIMARY KEY,
    source_table VARCHAR(64) NOT NULL,
    source_column VARCHAR(64) NOT NULL,
    target_table VARCHAR(64) NOT NULL,
    target_column VARCHAR(64) NOT NULL,
    relation_type VARCHAR(32) DEFAULT 'one-to-many',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    columns_def JSONB DEFAULT '[]',
    filters JSONB DEFAULT '[]',
    join_type VARCHAR(16) DEFAULT 'LEFT',
    created_at TIMESTAMP DEFAULT NOW()
);
