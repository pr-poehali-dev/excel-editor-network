"""
Локальный Flask-сервер — замена облачных функций для работы в закрытой сети.
Запуск: python local_server.py
"""
import json
import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app)

# === НАСТРОЙКИ ПОДКЛЮЧЕНИЯ К БАЗЕ ===
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "excel_editor"
DB_USER = "postgres"
DB_PASS = "root"
# =====================================

def get_conn():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS
    )


def ok(data, status=200):
    return jsonify(data), status


def err(msg, status=400):
    return jsonify({"error": msg}), status


@app.route("/", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def handler():
    if request.method == "OPTIONS":
        return "", 200

    method = request.method
    qs = request.args
    body = {}
    if request.data:
        try:
            body = json.loads(request.data)
        except Exception:
            pass

    resource = qs.get("resource", "")
    rid = qs.get("id", "")
    action = qs.get("action", "")

    if not resource and not action:
        return ok({"status": "ok", "version": "1.0"})

    if action == "seed" and method == "POST":
        return seed_initial_data()

    if action == "test_pg" and method == "POST":
        return test_pg_connection(body)

    if resource == "folders":
        if method == "GET" and not rid:
            return get_folders()
        if method == "POST":
            return create_folder(body)
        if method == "PUT" and rid:
            return update_folder(rid, body)
        if method == "DELETE" and rid:
            return delete_folder(rid)

    if resource == "tables":
        if method == "GET" and not rid:
            return get_tables()
        if method == "GET" and rid:
            return get_table(rid)
        if method == "POST":
            return create_table(body)
        if method == "PUT" and rid:
            return update_table(rid, body)
        if method == "DELETE" and rid:
            return delete_table(rid)

    if resource == "cells":
        if method == "GET":
            sheet_id = qs.get("sheet_id", "")
            if not sheet_id:
                return err("sheet_id required")
            return get_cells(sheet_id)
        if method == "POST":
            return save_cells(body)

    if resource == "relations":
        if method == "GET":
            return get_relations()
        if method == "POST":
            return create_relation(body)
        if method == "DELETE" and rid:
            return delete_relation(rid)

    if resource == "reports":
        if method == "GET":
            return get_reports()
        if method == "POST":
            return create_report(body)
        if method == "PUT" and rid:
            return update_report(rid, body)
        if method == "DELETE" and rid:
            return delete_report(rid)

    return err("Not found", 404)


# ════════════════════════════════════════════════════
# FOLDERS
# ════════════════════════════════════════════════════

def get_folders():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, name, parent_id, created_at FROM folders ORDER BY created_at")
            rows = cur.fetchall()
    return ok([dict(r) for r in rows])


def create_folder(body):
    fid = body.get("id") or f"f_{uuid.uuid4().hex[:8]}"
    name = body.get("name", "Новая папка")
    parent_id = body.get("parentId") or None
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO folders (id, name, parent_id) VALUES (%s, %s, %s) RETURNING *",
                (fid, name, parent_id)
            )
            row = cur.fetchone()
        conn.commit()
    return ok(dict(row), 201)


def update_folder(fid, body):
    name = body.get("name")
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("UPDATE folders SET name=%s WHERE id=%s RETURNING *", (name, fid))
            row = cur.fetchone()
        conn.commit()
    if not row:
        return err("Not found", 404)
    return ok(dict(row))


def delete_folder(fid):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE table_files SET folder_id=NULL WHERE folder_id=%s", (fid,))
            cur.execute("UPDATE folders SET parent_id=NULL WHERE parent_id=%s", (fid,))
            cur.execute("DELETE FROM folders WHERE id=%s", (fid,))
        conn.commit()
    return ok({"deleted": fid})


# ════════════════════════════════════════════════════
# TABLES
# ════════════════════════════════════════════════════

def get_tables():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT t.id, t.name, t.folder_id, t.row_count, t.col_count,
                       t.primary_key_col, t.updated_at, t.created_at,
                       COALESCE(json_agg(json_build_object(
                         'id', c.id, 'name', c.name, 'type', c.col_type,
                         'isPrimaryKey', c.is_primary_key, 'isForeignKey', c.is_foreign_key,
                         'referencesTable', c.references_table, 'referencesColumn', c.references_column
                       ) ORDER BY c.sort_order) FILTER (WHERE c.id IS NOT NULL), '[]') as columns,
                       COALESCE(json_agg(json_build_object(
                         'id', s.id, 'name', s.name, 'sort_order', s.sort_order,
                         'columnWidths', s.column_widths, 'rowHeights', s.row_heights
                       ) ORDER BY s.sort_order) FILTER (WHERE s.id IS NOT NULL), '[]') as sheets
                FROM table_files t
                LEFT JOIN column_defs c ON c.table_id = t.id
                LEFT JOIN sheets s ON s.table_id = t.id
                GROUP BY t.id
                ORDER BY t.created_at
            """)
            rows = cur.fetchall()
    result = []
    for r in rows:
        row = dict(r)
        result.append({
            "id": row["id"],
            "name": row["name"],
            "folderId": row["folder_id"],
            "rowCount": row["row_count"],
            "colCount": row["col_count"],
            "primaryKey": row["primary_key_col"],
            "updatedAt": str(row["updated_at"])[:16] if row["updated_at"] else "",
            "createdAt": str(row["created_at"])[:10] if row["created_at"] else "",
            "columns": row["columns"] if isinstance(row["columns"], list) else json.loads(row["columns"] or "[]"),
            "sheets": row["sheets"] if isinstance(row["sheets"], list) else json.loads(row["sheets"] or "[]"),
        })
    return ok(result)


def get_table(tid):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM table_files WHERE id=%s", (tid,))
            t = cur.fetchone()
            if not t:
                return err("Not found", 404)
            cur.execute("SELECT * FROM column_defs WHERE table_id=%s ORDER BY sort_order", (tid,))
            cols = cur.fetchall()
            cur.execute("SELECT * FROM sheets WHERE table_id=%s ORDER BY sort_order", (tid,))
            sheets_rows = cur.fetchall()

            sheets = []
            for s in sheets_rows:
                cur.execute("SELECT cell_addr, value, formula, style FROM cells WHERE sheet_id=%s", (s["id"],))
                cell_rows = cur.fetchall()
                cells_dict = {}
                for c in cell_rows:
                    style = c["style"] if isinstance(c["style"], dict) else json.loads(c["style"] or "{}")
                    cell_val = c["value"]
                    if cell_val is not None:
                        try:
                            cell_val = float(cell_val) if "." in str(cell_val) else int(cell_val)
                        except (ValueError, TypeError):
                            pass
                    cells_dict[c["cell_addr"]] = {
                        "value": cell_val,
                        "formula": c["formula"],
                        "style": style,
                    }
                cw = s["column_widths"] if isinstance(s["column_widths"], dict) else json.loads(s["column_widths"] or "{}")
                rh = s["row_heights"] if isinstance(s["row_heights"], dict) else json.loads(s["row_heights"] or "{}")
                sheets.append({
                    "id": s["id"],
                    "name": s["name"],
                    "cells": cells_dict,
                    "columnWidths": cw,
                    "rowHeights": rh,
                    "frozenRows": s.get("frozen_rows", 0) or 0,
                    "frozenCols": s.get("frozen_cols", 0) or 0,
                })

    return ok({
        "id": t["id"],
        "name": t["name"],
        "primaryKey": t["primary_key_col"],
        "columns": [{
            "id": c["id"], "name": c["name"], "type": c["col_type"],
            "isPrimaryKey": c["is_primary_key"], "isForeignKey": c["is_foreign_key"],
            "referencesTable": c["references_table"], "referencesColumn": c["references_column"],
        } for c in cols],
        "sheets": sheets,
    })


def create_table(body):
    tid = body.get("id") or f"t_{uuid.uuid4().hex[:8]}"
    name = body.get("name", "Новая таблица")
    folder_id = body.get("folderId") or None
    row_count = body.get("rowCount", 0)
    col_count = body.get("colCount", 0)
    primary_key = body.get("primaryKey") or None
    columns = body.get("columns", [])
    sheets = body.get("sheets", [])

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO table_files (id, name, folder_id, row_count, col_count, primary_key_col) VALUES (%s,%s,%s,%s,%s,%s)",
                (tid, name, folder_id, row_count, col_count, primary_key)
            )
            for i, col in enumerate(columns):
                cid = col.get("id") or f"col_{uuid.uuid4().hex[:6]}"
                cur.execute(
                    "INSERT INTO column_defs (id, table_id, name, col_type, is_primary_key, is_foreign_key, references_table, references_column, sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (cid, tid, col.get("name", ""), col.get("type", "string"),
                     col.get("isPrimaryKey", False), col.get("isForeignKey", False),
                     col.get("referencesTable"), col.get("referencesColumn"), i)
                )
            for i, sh in enumerate(sheets):
                sid = sh.get("id") or f"s_{uuid.uuid4().hex[:6]}"
                cur.execute(
                    "INSERT INTO sheets (id, table_id, name, column_widths, row_heights, sort_order) VALUES (%s,%s,%s,%s,%s,%s)",
                    (sid, tid, sh.get("name", f"Лист{i+1}"), "{}", "{}", i)
                )
        conn.commit()
    return ok({"id": tid}, 201)


def update_table(tid, body):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE table_files SET name=%s, folder_id=%s, row_count=%s, col_count=%s, primary_key_col=%s, updated_at=NOW() WHERE id=%s",
                (body.get("name"), body.get("folderId"), body.get("rowCount", 0), body.get("colCount", 0), body.get("primaryKey"), tid)
            )
        conn.commit()
    return ok({"updated": tid})


def delete_table(tid):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM column_defs WHERE table_id=%s", (tid,))
            cur.execute("SELECT id FROM sheets WHERE table_id=%s", (tid,))
            sheet_ids = [r[0] for r in cur.fetchall()]
            for sid in sheet_ids:
                cur.execute("DELETE FROM cells WHERE sheet_id=%s", (sid,))
            cur.execute("DELETE FROM sheets WHERE table_id=%s", (tid,))
            cur.execute("DELETE FROM table_files WHERE id=%s", (tid,))
        conn.commit()
    return ok({"deleted": tid})


# ════════════════════════════════════════════════════
# CELLS
# ════════════════════════════════════════════════════

def get_cells(sheet_id):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT cell_addr, value, formula, style FROM cells WHERE sheet_id=%s", (sheet_id,))
            rows = cur.fetchall()
    cells = {}
    for r in rows:
        style = r["style"] if isinstance(r["style"], dict) else json.loads(r["style"] or "{}")
        cells[r["cell_addr"]] = {"value": r["value"], "formula": r["formula"], "style": style}
    return ok(cells)


def save_cells(body):
    table_id = body.get("tableId")
    sheet_id = body.get("sheetId")
    cells = body.get("cells", {})
    columns = body.get("columns", [])
    sheets = body.get("sheets", [])

    if not sheet_id:
        return err("sheetId required")

    with get_conn() as conn:
        with conn.cursor() as cur:
            if table_id:
                row_count = body.get("rowCount", 0)
                col_count = body.get("colCount", 0)
                primary_key = body.get("primaryKey")
                cur.execute(
                    "UPDATE table_files SET row_count=%s, col_count=%s, primary_key_col=%s, updated_at=NOW() WHERE id=%s",
                    (row_count, col_count, primary_key, table_id)
                )
            if columns and table_id:
                cur.execute("DELETE FROM column_defs WHERE table_id=%s", (table_id,))
                for i, col in enumerate(columns):
                    cid = col.get("id") or f"col_{uuid.uuid4().hex[:6]}"
                    cur.execute(
                        "INSERT INTO column_defs (id, table_id, name, col_type, is_primary_key, is_foreign_key, references_table, references_column, sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                        (cid, table_id, col.get("name", ""), col.get("type", "string"),
                         col.get("isPrimaryKey", False), col.get("isForeignKey", False),
                         col.get("referencesTable"), col.get("referencesColumn"), i)
                    )
            if sheets and table_id:
                for sh in sheets:
                    if sh.get("id") == sheet_id:
                        cur.execute(
                            "UPDATE sheets SET column_widths=%s, row_heights=%s WHERE id=%s",
                            (json.dumps(sh.get("columnWidths", {})), json.dumps(sh.get("rowHeights", {})), sheet_id)
                        )
            cur.execute("DELETE FROM cells WHERE sheet_id=%s", (sheet_id,))
            for addr, cell in cells.items():
                val = str(cell.get("value", "")) if cell.get("value") is not None else None
                style = json.dumps(cell.get("style", {}))
                cur.execute(
                    "INSERT INTO cells (sheet_id, cell_addr, value, formula, style) VALUES (%s,%s,%s,%s,%s)",
                    (sheet_id, addr, val, cell.get("formula"), style)
                )
        conn.commit()
    return ok({"saved": len(cells)})


# ════════════════════════════════════════════════════
# RELATIONS
# ════════════════════════════════════════════════════

def get_relations():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM table_relations ORDER BY created_at")
            rows = cur.fetchall()
    return ok([{
        "id": r["id"], "sourceTable": r["source_table"], "sourceColumn": r["source_column"],
        "targetTable": r["target_table"], "targetColumn": r["target_column"], "type": r["relation_type"],
    } for r in rows])


def create_relation(body):
    rid = body.get("id") or f"r_{uuid.uuid4().hex[:8]}"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO table_relations (id, source_table, source_column, target_table, target_column, relation_type) VALUES (%s,%s,%s,%s,%s,%s)",
                (rid, body["sourceTable"], body["sourceColumn"], body["targetTable"], body["targetColumn"], body.get("type", "one-to-many"))
            )
        conn.commit()
    return ok({"id": rid}, 201)


def delete_relation(rid):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM table_relations WHERE id=%s", (rid,))
        conn.commit()
    return ok({"deleted": rid})


# ════════════════════════════════════════════════════
# REPORTS
# ════════════════════════════════════════════════════

def get_reports():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM reports ORDER BY created_at")
            rows = cur.fetchall()
    return ok([{
        "id": r["id"], "name": r["name"], "description": r["description"],
        "columns": r["columns_def"] if isinstance(r["columns_def"], list) else json.loads(r["columns_def"] or "[]"),
        "filters": r["filters"] if isinstance(r["filters"], list) else json.loads(r["filters"] or "[]"),
        "joinType": r["join_type"], "createdAt": str(r["created_at"])[:10],
    } for r in rows])


def create_report(body):
    rid = body.get("id") or f"rep_{uuid.uuid4().hex[:8]}"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO reports (id, name, description, columns_def, filters, join_type) VALUES (%s,%s,%s,%s,%s,%s)",
                (rid, body["name"], body.get("description"), json.dumps(body.get("columns", [])), json.dumps(body.get("filters", [])), body.get("joinType", "LEFT"))
            )
        conn.commit()
    return ok({"id": rid}, 201)


def update_report(rid, body):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE reports SET name=%s, description=%s, columns_def=%s, filters=%s, join_type=%s WHERE id=%s",
                (body["name"], body.get("description"), json.dumps(body.get("columns", [])), json.dumps(body.get("filters", [])), body.get("joinType", "LEFT"), rid)
            )
        conn.commit()
    return ok({"updated": rid})


def delete_report(rid):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM reports WHERE id=%s", (rid,))
        conn.commit()
    return ok({"deleted": rid})


# ════════════════════════════════════════════════════
# SEED
# ════════════════════════════════════════════════════

def seed_initial_data():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM folders")
            count = cur.fetchone()[0]
            if count > 0:
                return ok({"status": "already seeded", "folders": count})

            folders = [
                ("f1","Финансы",None,"2024-01-10"),
                ("f2","Продажи",None,"2024-01-12"),
                ("f3","Склад",None,"2024-01-15"),
                ("f4","Q1 2024","f1","2024-01-20"),
                ("f5","Q2 2024","f1","2024-04-01"),
            ]
            for f in folders:
                cur.execute("INSERT INTO folders (id,name,parent_id,created_at) VALUES (%s,%s,%s,%s)", f)

            tables = [
                ("t1","Прайс-лист.xlsx","f2",7,8,"col0"),
                ("t2","Клиенты.xlsx","f2",0,7,None),
                ("t3","Заказы.xlsx","f2",0,7,None),
                ("t4","Бюджет 2024.xlsx","f4",0,7,None),
                ("t5","Остатки склада.xlsx","f3",0,6,None),
                ("t6","Сотрудники.xlsx",None,0,8,None),
            ]
            for t in tables:
                cur.execute("INSERT INTO table_files (id,name,folder_id,row_count,col_count,primary_key_col) VALUES (%s,%s,%s,%s,%s,%s)", t)

            cur.execute("INSERT INTO sheets (id,table_id,name,column_widths,row_heights,sort_order) VALUES ('s1','t1','Прайс-лист','{}','{}',0)")
            cur.execute("INSERT INTO sheets (id,table_id,name,column_widths,row_heights,sort_order) VALUES ('s2','t1','Архив','{}','{}',1)")

            cols = [
                ("col0","t1","ID","number",True,0),
                ("col1","t1","Артикул","string",False,1),
                ("col2","t1","Наименование","string",False,2),
                ("col3","t1","Категория","string",False,3),
                ("col4","t1","Цена","number",False,4),
                ("col5","t1","Цена со скидкой","number",False,5),
                ("col6","t1","Ед.изм.","string",False,6),
                ("col7","t1","Наличие","string",False,7),
            ]
            for c in cols:
                cur.execute("INSERT INTO column_defs (id,table_id,name,col_type,is_primary_key,sort_order) VALUES (%s,%s,%s,%s,%s,%s)", c)

            s1_cells = [
                ("A1","ID",'{"bold":true,"bgColor":"#217346","fontColor":"#ffffff","align":"center"}'),
                ("B1","Артикул",'{"bold":true,"bgColor":"#217346","fontColor":"#ffffff"}'),
                ("C1","Наименование",'{"bold":true,"bgColor":"#217346","fontColor":"#ffffff"}'),
                ("D1","Категория",'{"bold":true,"bgColor":"#217346","fontColor":"#ffffff"}'),
                ("E1","Цена",'{"bold":true,"bgColor":"#217346","fontColor":"#ffffff","align":"right"}'),
                ("F1","Цена со скидкой",'{"bold":true,"bgColor":"#217346","fontColor":"#ffffff","align":"right"}'),
                ("G1","Ед.изм.",'{"bold":true,"bgColor":"#217346","fontColor":"#ffffff","align":"center"}'),
                ("H1","Наличие",'{"bold":true,"bgColor":"#217346","fontColor":"#ffffff","align":"center"}'),
                ("A2","1","{}"),("B2","PRD-001","{}"),("C2","Ноутбук Dell Latitude 5540","{}"),("D2","Техника","{}"),
                ("E2","89990",'{"align":"right"}'),("F2","76990",'{"align":"right","fontColor":"#c00000"}'),
                ("G2","шт",'{"align":"center"}'),("H2","В наличии",'{"bgColor":"#e2efda","fontColor":"#375623","align":"center"}'),
                ("A3","2","{}"),("B3","PRD-002","{}"),("C3","Монитор Samsung 27\"","{}"),("D3","Техника","{}"),
                ("E3","24990",'{"align":"right"}'),("F3","21990",'{"align":"right","fontColor":"#c00000"}'),
                ("G3","шт",'{"align":"center"}'),("H3","В наличии",'{"bgColor":"#e2efda","fontColor":"#375623","align":"center"}'),
            ]
            for addr, val, style in s1_cells:
                cur.execute("INSERT INTO cells (sheet_id,cell_addr,value,style) VALUES (%s,%s,%s,%s)", ("s1", addr, val, style))

            relations = [
                ("r1","t3","client_id","t2","id","one-to-many"),
                ("r2","t3","product_id","t1","id","one-to-many"),
                ("r3","t5","product_id","t1","id","one-to-one"),
            ]
            for r in relations:
                cur.execute("INSERT INTO table_relations (id,source_table,source_column,target_table,target_column,relation_type) VALUES (%s,%s,%s,%s,%s,%s)", r)

        conn.commit()
    return ok({"status": "seeded"})


def test_pg_connection(body):
    return ok({"ok": True, "message": "Локальный сервер"})


if __name__ == "__main__":
    print("=" * 50)
    print("  Локальный сервер запущен!")
    print("  Адрес: http://localhost:8000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=8000, debug=False)
