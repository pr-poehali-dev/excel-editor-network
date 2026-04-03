import { useState, useRef, useCallback, useEffect } from 'react';
import { TableData, Cell, CellStyle, OnlineUser } from '@/types';
import Icon from '@/components/ui/icon';

interface Props {
  tableData: TableData;
  onTableChange: (data: TableData) => void;
  onlineUsers: OnlineUser[];
}

const COLS = 26;
const ROWS = 50;

const colLetter = (i: number) => {
  if (i < 26) return String.fromCharCode(65 + i);
  return String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
};

const cellKey = (row: number, col: number) => `${colLetter(col)}${row + 1}`;

export default function TableEditor({ tableData, onTableChange, onlineUsers }: Props) {
  const [activeSheetId, setActiveSheetId] = useState(tableData.sheets[0]?.id);
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const editInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const activeSheet = tableData.sheets.find(s => s.id === activeSheetId) || tableData.sheets[0];

  const getCell = useCallback((key: string): Cell => {
    return activeSheet?.cells[key] || { value: null };
  }, [activeSheet]);

  const updateCell = useCallback((key: string, value: string) => {
    const updated = { ...tableData };
    const sheetIdx = updated.sheets.findIndex(s => s.id === activeSheetId);
    if (sheetIdx === -1) return;
    updated.sheets[sheetIdx] = {
      ...updated.sheets[sheetIdx],
      cells: {
        ...updated.sheets[sheetIdx].cells,
        [key]: { ...updated.sheets[sheetIdx].cells[key], value: isNaN(Number(value)) || value === '' ? value : Number(value) }
      }
    };
    onTableChange(updated);
  }, [tableData, activeSheetId, onTableChange]);

  const applyStyle = useCallback((style: Partial<CellStyle>) => {
    const updated = { ...tableData };
    const sheetIdx = updated.sheets.findIndex(s => s.id === activeSheetId);
    if (sheetIdx === -1) return;
    const existing = updated.sheets[sheetIdx].cells[selectedCell] || { value: null };
    updated.sheets[sheetIdx] = {
      ...updated.sheets[sheetIdx],
      cells: {
        ...updated.sheets[sheetIdx].cells,
        [selectedCell]: { ...existing, style: { ...existing.style, ...style } }
      }
    };
    onTableChange(updated);
  }, [tableData, activeSheetId, selectedCell, onTableChange]);

  const startEdit = (key: string) => {
    const cell = getCell(key);
    setEditingCell(key);
    setEditValue(cell.formula || String(cell.value ?? ''));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (editingCell) {
      updateCell(editingCell, editValue);
      setEditingCell(null);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') { commitEdit(); if (row < ROWS - 1) setSelectedCell(cellKey(row + 1, col)); }
    else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); if (col < COLS - 1) setSelectedCell(cellKey(row, col + 1)); }
    else if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
  };

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;
    const match = selectedCell.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    const col = match[1].charCodeAt(0) - 65;
    const row = parseInt(match[2]) - 1;
    if (e.key === 'ArrowDown' && row < ROWS - 1) { e.preventDefault(); setSelectedCell(cellKey(row + 1, col)); }
    else if (e.key === 'ArrowUp' && row > 0) { e.preventDefault(); setSelectedCell(cellKey(row - 1, col)); }
    else if (e.key === 'ArrowRight' && col < COLS - 1) { e.preventDefault(); setSelectedCell(cellKey(row, col + 1)); }
    else if (e.key === 'ArrowLeft' && col > 0) { e.preventDefault(); setSelectedCell(cellKey(row, col - 1)); }
    else if (e.key === 'Enter' || e.key === 'F2') { startEdit(selectedCell); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { updateCell(selectedCell, ''); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { setEditValue(e.key); startEdit(selectedCell); }
  };

  useEffect(() => {
    const cell = getCell(selectedCell);
    setFormulaBarValue(cell.formula || String(cell.value ?? ''));
  }, [selectedCell, getCell]);

  const currentCell = getCell(selectedCell);
  const currentStyle = currentCell.style || {};

  const getUserInCell = (key: string) => onlineUsers.find(u => u.activeCell === key && u.activeTable === tableData.id && u.id !== 'u3');

  return (
    <div className="flex flex-col h-full bg-white" onKeyDown={handleGridKeyDown} tabIndex={0} ref={gridRef}>
      {/* Ribbon toolbar */}
      <div className="border-b bg-gray-50">
        {/* Formatting row */}
        <div className="flex items-center gap-1 px-3 py-1.5 flex-wrap">
          <select className="text-xs border rounded px-1 py-0.5 bg-white h-7 focus:outline-none focus:border-green-500 mr-1">
            <option>PT Astra Serif</option>
            <option>PT Serif</option>
            <option>IBM Plex Sans</option>
            <option>Arial</option>
            <option>Times New Roman</option>
            <option>Courier New</option>
          </select>
          <select className="text-xs border rounded px-1 py-0.5 bg-white h-7 w-14 focus:outline-none focus:border-green-500 mr-1"
            value={currentStyle.fontSize || 12}
            onChange={e => applyStyle({ fontSize: Number(e.target.value) })}>
            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="toolbar-separator" />
          <button className={`toolbar-btn font-bold ${currentStyle.bold ? 'bg-gray-300' : ''}`} title="Жирный" onClick={() => applyStyle({ bold: !currentStyle.bold })}><b>Ж</b></button>
          <button className={`toolbar-btn italic ${currentStyle.italic ? 'bg-gray-300' : ''}`} title="Курсив" onClick={() => applyStyle({ italic: !currentStyle.italic })}><i>К</i></button>
          <button className={`toolbar-btn underline ${currentStyle.underline ? 'bg-gray-300' : ''}`} title="Подчёркивание" onClick={() => applyStyle({ underline: !currentStyle.underline })}><u>Ч</u></button>
          <div className="toolbar-separator" />
          <button className={`toolbar-btn ${currentStyle.align === 'left' ? 'bg-gray-300' : ''}`} title="По левому краю" onClick={() => applyStyle({ align: 'left' })}><Icon name="AlignLeft" size={14} /></button>
          <button className={`toolbar-btn ${currentStyle.align === 'center' ? 'bg-gray-300' : ''}`} title="По центру" onClick={() => applyStyle({ align: 'center' })}><Icon name="AlignCenter" size={14} /></button>
          <button className={`toolbar-btn ${currentStyle.align === 'right' ? 'bg-gray-300' : ''}`} title="По правому краю" onClick={() => applyStyle({ align: 'right' })}><Icon name="AlignRight" size={14} /></button>
          <div className="toolbar-separator" />
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Цвет фона:</label>
            <input type="color" className="w-6 h-6 border rounded cursor-pointer" value={currentStyle.bgColor || '#ffffff'}
              onChange={e => applyStyle({ bgColor: e.target.value })} title="Цвет фона" />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Шрифт:</label>
            <input type="color" className="w-6 h-6 border rounded cursor-pointer" value={currentStyle.fontColor || '#000000'}
              onChange={e => applyStyle({ fontColor: e.target.value })} title="Цвет шрифта" />
          </div>
          <div className="toolbar-separator" />
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-gray-500">Масштаб:</span>
            <select className="text-xs border rounded px-1 py-0.5 bg-white h-7 focus:outline-none" value={zoom} onChange={e => setZoom(Number(e.target.value))}>
              {[75, 100, 125, 150].map(z => <option key={z} value={z}>{z}%</option>)}
            </select>
          </div>
        </div>

        {/* Formula bar */}
        <div className="flex items-center gap-2 px-3 py-1 border-t bg-white">
          <div className="font-mono text-xs border rounded px-2 py-1 bg-gray-50 min-w-16 text-center font-semibold text-green-700">
            {selectedCell}
          </div>
          <div className="w-px h-5 bg-gray-300" />
          <Icon name="FunctionSquare" size={14} className="text-gray-400" />
          <input
            className="flex-1 text-sm outline-none font-mono"
            value={formulaBarValue}
            onChange={e => { setFormulaBarValue(e.target.value); if (editingCell) setEditValue(e.target.value); }}
            onFocus={() => { if (!editingCell) startEdit(selectedCell); }}
            onKeyDown={e => { if (e.key === 'Enter') { commitEdit(); } else if (e.key === 'Escape') { setEditingCell(null); } }}
            placeholder="Введите значение или формулу..."
          />
          {/* Online users indicator */}
          <div className="flex items-center gap-1">
            {onlineUsers.map(u => (
              <div key={u.id} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-default" style={{ backgroundColor: u.color }} title={u.name}>
                {u.name.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto" style={{ fontSize: `${zoom}%` }}>
        <table className="excel-grid" style={{ minWidth: '100%' }}>
          <thead>
            <tr>
              <th className="row-header" style={{ position: 'sticky', top: 0, left: 0, zIndex: 20 }}></th>
              {Array.from({ length: COLS }, (_, i) => (
                <th key={i} style={{ minWidth: activeSheet?.columnWidths?.[i] || 100 }}>
                  {colLetter(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, rowIdx) => (
              <tr key={rowIdx}>
                <td className="row-header" style={{ position: 'sticky', left: 0, zIndex: 5 }}>{rowIdx + 1}</td>
                {Array.from({ length: COLS }, (_, colIdx) => {
                  const key = cellKey(rowIdx, colIdx);
                  const cell = getCell(key);
                  const style = cell.style || {};
                  const isSelected = selectedCell === key;
                  const isEditing = editingCell === key;
                  const onlineUser = getUserInCell(key);

                  return (
                    <td
                      key={colIdx}
                      className={`${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
                      style={{
                        backgroundColor: isSelected ? undefined : style.bgColor || undefined,
                        color: style.fontColor || undefined,
                        fontWeight: style.bold ? 'bold' : undefined,
                        fontStyle: style.italic ? 'italic' : undefined,
                        textDecoration: style.underline ? 'underline' : undefined,
                        textAlign: style.align || 'left',
                        fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
                        position: 'relative',
                        outline: onlineUser ? `2px solid ${onlineUser.color}` : undefined,
                        outlineOffset: '-2px',
                      }}
                      onClick={() => { commitEdit(); setSelectedCell(key); }}
                      onDoubleClick={() => startEdit(key)}
                    >
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          className="w-full h-full border-none outline-none px-1.5 py-0.5 font-sans text-sm"
                          style={{ outline: '2px solid #0078d4', outlineOffset: '-2px' }}
                          value={editValue}
                          onChange={e => { setEditValue(e.target.value); setFormulaBarValue(e.target.value); }}
                          onBlur={commitEdit}
                          onKeyDown={e => handleCellKeyDown(e, rowIdx, colIdx)}
                        />
                      ) : (
                        <span className="block px-1 truncate">{cell.value !== null && cell.value !== undefined ? String(cell.value) : ''}</span>
                      )}
                      {onlineUser && (
                        <div className="absolute -top-3 -right-1 text-white text-[9px] px-1 rounded z-20 pointer-events-none" style={{ backgroundColor: onlineUser.color }}>
                          {onlineUser.name.split(' ')[0]}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-end border-t bg-gray-100 px-2 pt-1 gap-1 overflow-x-auto">
        {tableData.sheets.map(sheet => (
          <div
            key={sheet.id}
            className={`sheet-tab ${sheet.id === activeSheetId ? 'active' : ''}`}
            onClick={() => setActiveSheetId(sheet.id)}
          >
            {sheet.name}
          </div>
        ))}
        <button className="sheet-tab hover:bg-white" title="Добавить лист">
          <Icon name="Plus" size={12} />
        </button>
        {/* Status bar */}
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-500 pb-1 pr-2">
          {currentCell.value !== null && currentCell.value !== undefined && (
            <>
              <span>Сумма: {typeof currentCell.value === 'number' ? currentCell.value : '—'}</span>
              <span>Ячейка: {selectedCell}</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Icon name="Users" size={11} />
            {onlineUsers.length} онлайн
          </span>
        </div>
      </div>
    </div>
  );
}