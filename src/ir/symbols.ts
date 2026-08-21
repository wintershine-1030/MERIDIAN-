import type { ColumnDeclaration, TableDeclaration } from "../ast/nodes.js";

export class SymbolTable {
  private readonly tables = new Map<string, TableDeclaration>();
  private readonly columnsByTable = new Map<string, Map<string, ColumnDeclaration>>();

  addTable(table: TableDeclaration): boolean {
    if (this.tables.has(table.name)) {
      return false;
    }
    this.tables.set(table.name, table);
    this.columnsByTable.set(table.name, new Map());
    return true;
  }

  addColumn(tableName: string, column: ColumnDeclaration): boolean {
    const columns = this.columnsByTable.get(tableName);
    if (columns === undefined) {
      throw new Error(`addColumn called for unknown table '${tableName}'`);
    }
    if (columns.has(column.name)) {
      return false;
    }
    columns.set(column.name, column);
    return true;
  }

  hasTable(name: string): boolean {
    return this.tables.has(name);
  }

  hasColumn(tableName: string, columnName: string): boolean {
    return this.columnsByTable.get(tableName)?.has(columnName) ?? false;
  }

  tableNames(): string[] {
    return [...this.tables.keys()];
  }
}
