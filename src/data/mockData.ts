import { Folder, TableFile, TableData, Relation, Report, OnlineUser } from '@/types';

export const mockFolders: Folder[] = [
  { id: 'f1', name: 'Финансы', parentId: null, createdAt: '2024-01-10' },
  { id: 'f2', name: 'Продажи', parentId: null, createdAt: '2024-01-12' },
  { id: 'f3', name: 'Склад', parentId: null, createdAt: '2024-01-15' },
  { id: 'f4', name: 'Q1 2024', parentId: 'f1', createdAt: '2024-01-20' },
  { id: 'f5', name: 'Q2 2024', parentId: 'f1', createdAt: '2024-04-01' },
];

export const mockTables: TableFile[] = [
  { id: 't1', name: 'Прайс-лист.xlsx', folderId: 'f2', rowCount: 248, colCount: 12, updatedAt: '2024-03-15 14:22', createdAt: '2024-01-20' },
  { id: 't2', name: 'Клиенты.xlsx', folderId: 'f2', rowCount: 1043, colCount: 8, updatedAt: '2024-03-14 09:10', createdAt: '2024-01-25' },
  { id: 't3', name: 'Заказы.xlsx', folderId: 'f2', rowCount: 5621, colCount: 15, updatedAt: '2024-03-15 16:45', createdAt: '2024-02-01' },
  { id: 't4', name: 'Бюджет 2024.xlsx', folderId: 'f4', rowCount: 84, colCount: 20, updatedAt: '2024-03-10 11:30', createdAt: '2024-01-30' },
  { id: 't5', name: 'Остатки склада.xlsx', folderId: 'f3', rowCount: 392, colCount: 10, updatedAt: '2024-03-15 08:00', createdAt: '2024-02-05' },
  { id: 't6', name: 'Сотрудники.xlsx', folderId: null, rowCount: 67, colCount: 14, updatedAt: '2024-03-12 15:20', createdAt: '2024-02-10' },
];

export const mockTableData: TableData = {
  id: 't1',
  name: 'Прайс-лист',
  primaryKey: 'col0',
  columns: [
    { id: 'col0', name: 'ID', type: 'number', isPrimaryKey: true },
    { id: 'col1', name: 'Артикул', type: 'string' },
    { id: 'col2', name: 'Наименование', type: 'string' },
    { id: 'col3', name: 'Категория', type: 'string' },
    { id: 'col4', name: 'Цена', type: 'number' },
    { id: 'col5', name: 'Цена со скидкой', type: 'number' },
    { id: 'col6', name: 'Ед.изм.', type: 'string' },
    { id: 'col7', name: 'Наличие', type: 'string' },
  ],
  sheets: [
    {
      id: 's1',
      name: 'Прайс-лист',
      columnWidths: { 0: 50, 1: 100, 2: 220, 3: 140, 4: 100, 5: 120, 6: 70, 7: 90 },
      rowHeights: {},
      cells: {
        // Headers
        'A1': { value: 'ID', style: { bold: true, bgColor: '#217346', fontColor: '#ffffff', align: 'center' } },
        'B1': { value: 'Артикул', style: { bold: true, bgColor: '#217346', fontColor: '#ffffff' } },
        'C1': { value: 'Наименование', style: { bold: true, bgColor: '#217346', fontColor: '#ffffff' } },
        'D1': { value: 'Категория', style: { bold: true, bgColor: '#217346', fontColor: '#ffffff' } },
        'E1': { value: 'Цена', style: { bold: true, bgColor: '#217346', fontColor: '#ffffff', align: 'right' } },
        'F1': { value: 'Цена со скидкой', style: { bold: true, bgColor: '#217346', fontColor: '#ffffff', align: 'right' } },
        'G1': { value: 'Ед.изм.', style: { bold: true, bgColor: '#217346', fontColor: '#ffffff', align: 'center' } },
        'H1': { value: 'Наличие', style: { bold: true, bgColor: '#217346', fontColor: '#ffffff', align: 'center' } },
        // Row 2
        'A2': { value: 1 }, 'B2': { value: 'PRD-001' }, 'C2': { value: 'Ноутбук Dell Latitude 5540' }, 'D2': { value: 'Техника' },
        'E2': { value: 89990, style: { align: 'right' } }, 'F2': { value: 76990, style: { align: 'right', fontColor: '#c00000' } },
        'G2': { value: 'шт', style: { align: 'center' } }, 'H2': { value: 'В наличии', style: { bgColor: '#e2efda', fontColor: '#375623', align: 'center' } },
        // Row 3
        'A3': { value: 2 }, 'B3': { value: 'PRD-002' }, 'C3': { value: 'Монитор Samsung 27"' }, 'D3': { value: 'Техника' },
        'E3': { value: 24990, style: { align: 'right' } }, 'F3': { value: 21990, style: { align: 'right', fontColor: '#c00000' } },
        'G3': { value: 'шт', style: { align: 'center' } }, 'H3': { value: 'В наличии', style: { bgColor: '#e2efda', fontColor: '#375623', align: 'center' } },
        // Row 4
        'A4': { value: 3 }, 'B4': { value: 'PRD-003' }, 'C4': { value: 'Клавиатура Logitech MX Keys' }, 'D4': { value: 'Периферия' },
        'E4': { value: 8990, style: { align: 'right' } }, 'F4': { value: 7490, style: { align: 'right', fontColor: '#c00000' } },
        'G4': { value: 'шт', style: { align: 'center' } }, 'H4': { value: 'Под заказ', style: { bgColor: '#fff2cc', fontColor: '#7f6000', align: 'center' } },
        // Row 5
        'A5': { value: 4 }, 'B5': { value: 'PRD-004' }, 'C5': { value: 'Мышь Logitech MX Master 3' }, 'D5': { value: 'Периферия' },
        'E5': { value: 6490, style: { align: 'right' } }, 'F5': { value: 5990, style: { align: 'right', fontColor: '#c00000' } },
        'G5': { value: 'шт', style: { align: 'center' } }, 'H5': { value: 'В наличии', style: { bgColor: '#e2efda', fontColor: '#375623', align: 'center' } },
        // Row 6
        'A6': { value: 5 }, 'B6': { value: 'PRD-005' }, 'C6': { value: 'Принтер HP LaserJet Pro' }, 'D6': { value: 'Оргтехника' },
        'E6': { value: 32990, style: { align: 'right' } }, 'F6': { value: 29990, style: { align: 'right', fontColor: '#c00000' } },
        'G6': { value: 'шт', style: { align: 'center' } }, 'H6': { value: 'Нет в наличии', style: { bgColor: '#fce4d6', fontColor: '#843c0c', align: 'center' } },
        // Row 7
        'A7': { value: 6 }, 'B7': { value: 'PRD-006' }, 'C7': { value: 'Наушники Sony WH-1000XM5' }, 'D7': { value: 'Аудио' },
        'E7': { value: 29990, style: { align: 'right' } }, 'F7': { value: 24990, style: { align: 'right', fontColor: '#c00000' } },
        'G7': { value: 'шт', style: { align: 'center' } }, 'H7': { value: 'В наличии', style: { bgColor: '#e2efda', fontColor: '#375623', align: 'center' } },
        // Row 8
        'A8': { value: 7 }, 'B8': { value: 'PRD-007' }, 'C8': { value: 'Веб-камера Logitech C925e' }, 'D8': { value: 'Периферия' },
        'E8': { value: 12990, style: { align: 'right' } }, 'F8': { value: 11490, style: { align: 'right', fontColor: '#c00000' } },
        'G8': { value: 'шт', style: { align: 'center' } }, 'H8': { value: 'В наличии', style: { bgColor: '#e2efda', fontColor: '#375623', align: 'center' } },
      }
    },
    {
      id: 's2',
      name: 'Архив',
      columnWidths: {},
      rowHeights: {},
      cells: {
        'A1': { value: 'ID', style: { bold: true } },
        'B1': { value: 'Наименование', style: { bold: true } },
        'C1': { value: 'Дата снятия', style: { bold: true } },
        'A2': { value: 101 }, 'B2': { value: 'Старая модель принтера' }, 'C2': { value: '2023-12-01' },
      }
    }
  ]
};

export const mockRelations: Relation[] = [
  { id: 'r1', sourceTable: 't3', sourceColumn: 'client_id', targetTable: 't2', targetColumn: 'id', type: 'one-to-many' },
  { id: 'r2', sourceTable: 't3', sourceColumn: 'product_id', targetTable: 't1', targetColumn: 'id', type: 'one-to-many' },
  { id: 'r3', sourceTable: 't5', sourceColumn: 'product_id', targetTable: 't1', targetColumn: 'id', type: 'one-to-one' },
];

export const mockReports: Report[] = [
  {
    id: 'rep1',
    name: 'Заказы с клиентами',
    description: 'Список заказов с именами клиентов и продуктами',
    columns: [
      { tableId: 't3', tableName: 'Заказы', columnId: 'order_id', columnName: 'Номер заказа' },
      { tableId: 't2', tableName: 'Клиенты', columnId: 'name', columnName: 'Клиент' },
      { tableId: 't1', tableName: 'Прайс-лист', columnId: 'name', columnName: 'Продукт' },
      { tableId: 't3', tableName: 'Заказы', columnId: 'amount', columnName: 'Сумма' },
    ],
    filters: [],
    joinType: 'LEFT',
    createdAt: '2024-02-15'
  },
  {
    id: 'rep2',
    name: 'Остатки по категориям',
    description: 'Остатки склада с ценами из прайс-листа',
    columns: [
      { tableId: 't1', tableName: 'Прайс-лист', columnId: 'category', columnName: 'Категория' },
      { tableId: 't1', tableName: 'Прайс-лист', columnId: 'name', columnName: 'Наименование' },
      { tableId: 't5', tableName: 'Остатки склада', columnId: 'qty', columnName: 'Количество' },
      { tableId: 't1', tableName: 'Прайс-лист', columnId: 'price', columnName: 'Цена' },
    ],
    filters: [{ tableId: 't5', columnId: 'qty', operator: '>', value: '0' }],
    joinType: 'INNER',
    createdAt: '2024-02-20'
  }
];

export const mockOnlineUsers: OnlineUser[] = [
  { id: 'u1', name: 'Алексей К.', color: '#3b82f6', activeTable: 't1', activeCell: 'C5' },
  { id: 'u2', name: 'Мария С.', color: '#f59e0b', activeTable: 't2', activeCell: 'B12' },
  { id: 'u3', name: 'Вы', color: '#217346', activeTable: 't1', activeCell: 'A1' },
];