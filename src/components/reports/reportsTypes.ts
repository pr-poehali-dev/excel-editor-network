import { ReportColumn, ReportFilter } from '@/types';

export type Aggregate = 'none' | 'SUM' | 'COUNT' | 'AVG' | 'MAX' | 'MIN';

export interface ColumnWithAgg extends ReportColumn {
  aggregate?: Aggregate;
}

export interface BuilderState {
  name: string;
  description: string;
  columns: ColumnWithAgg[];
  filters: ReportFilter[];
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  groupBy: string[];
  orderByCol: string;
  orderByDir: 'ASC' | 'DESC';
  limit: string;
}

export interface ReportsTableData {
  columns: { id: string; name: string; type: string }[];
}

export const defaultBuilder = (): BuilderState => ({
  name: '', description: '', columns: [], filters: [],
  joinType: 'LEFT', groupBy: [], orderByCol: '', orderByDir: 'ASC', limit: '',
});

export const mockColumns: Record<string, string[]> = {
  't1': ['ID', 'Артикул', 'Наименование', 'Категория', 'Цена', 'Цена со скидкой', 'Ед.изм.', 'Наличие'],
  't2': ['ID', 'Имя клиента', 'Email', 'Телефон', 'Город', 'Сегмент', 'Дата регистрации'],
  't3': ['ID заказа', 'ID клиента', 'ID продукта', 'Дата заказа', 'Количество', 'Сумма', 'Статус'],
  't4': ['Период', 'Доходы', 'Расходы', 'Прибыль', 'Бюджет', 'Факт', 'Отклонение'],
  't5': ['ID продукта', 'Артикул', 'Количество', 'Ячейка', 'Дата прихода', 'Дата выдачи'],
  't6': ['ID', 'ФИО', 'Должность', 'Отдел', 'Email', 'Телефон', 'Дата найма', 'Зарплата'],
};

export const sampleData = [
  { '№ Заказа': 'ORD-5621', 'Клиент': 'ООО Технологии', 'Продукт': 'Ноутбук Dell', 'Сумма': '89 990 ₽', 'Дата': '2024-03-15', 'Статус': 'Доставлен' },
  { '№ Заказа': 'ORD-5620', 'Клиент': 'ИП Сидоров', 'Продукт': 'Монитор Samsung', 'Сумма': '24 990 ₽', 'Дата': '2024-03-14', 'Статус': 'В пути' },
  { '№ Заказа': 'ORD-5619', 'Клиент': 'АО Прогресс', 'Продукт': 'Наушники Sony', 'Сумма': '29 990 ₽', 'Дата': '2024-03-14', 'Статус': 'Доставлен' },
  { '№ Заказа': 'ORD-5618', 'Клиент': 'ООО Рост', 'Продукт': 'Клавиатура Logitech', 'Сумма': '8 990 ₽', 'Дата': '2024-03-13', 'Статус': 'Отменён' },
  { '№ Заказа': 'ORD-5617', 'Клиент': 'ИП Кузнецов', 'Продукт': 'Принтер HP', 'Сумма': '32 990 ₽', 'Дата': '2024-03-13', 'Статус': 'Доставлен' },
];

export function getColsForTable(tableId: string, tdm: Record<string, ReportsTableData>): string[] {
  const td = tdm[tableId];
  if (td?.columns?.length) return td.columns.map(c => c.name);
  return mockColumns[tableId] || [];
}

export function buildSQL(b: BuilderState): string {
  if (!b.columns.length) return '-- Добавьте столбцы для генерации SQL';
  const selects = b.columns.map(col => {
    const ref = `\`${col.tableName}\`.\`${col.columnName}\``;
    const expr = col.aggregate && col.aggregate !== 'none' ? `${col.aggregate}(${ref})` : ref;
    return col.alias ? `${expr} AS \`${col.alias}\`` : expr;
  });
  const firstTable = b.columns[0].tableName;
  const otherTables = [...new Set(b.columns.slice(1).map(c => c.tableName))].filter(t => t !== firstTable);
  const wheres = b.filters.filter(f => f.columnId && f.value).map(f => `  \`${f.columnId}\` ${f.operator} '${f.value}'`);
  return [
    `SELECT\n  ${selects.join(',\n  ')}`,
    `FROM \`${firstTable}\``,
    ...otherTables.map(t => `  ${b.joinType} JOIN \`${t}\` ON ...`),
    ...(wheres.length ? [`WHERE\n${wheres.join('\n  AND ')}`] : []),
    ...(b.groupBy.length ? [`GROUP BY ${b.groupBy.map(g => `\`${g}\``).join(', ')}`] : []),
    ...(b.orderByCol ? [`ORDER BY \`${b.orderByCol}\` ${b.orderByDir}`] : []),
    ...(b.limit ? [`LIMIT ${b.limit}`] : []),
  ].filter(Boolean).join('\n');
}
