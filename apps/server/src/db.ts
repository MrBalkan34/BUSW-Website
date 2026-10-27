import { DatabaseSync, type SQLInputValue } from "node:sqlite";

type Param = SQLInputValue;

/**
 * A thin wrapper over Node's built-in SQLite. Better Auth uses the raw handle for its own tables; everything
 * else in this server goes through these helpers, always with bound parameters (never string-built SQL).
 */
export class Db {
  readonly raw: DatabaseSync;
  private depth = 0;

  constructor(path: string) {
    this.raw = new DatabaseSync(path);
    this.raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  }

  run(sql: string, ...params: Param[]): { changes: number } {
    const result = this.raw.prepare(sql).run(...params);
    return { changes: Number(result.changes) };
  }

  get<T>(sql: string, ...params: Param[]): T | undefined {
    return this.raw.prepare(sql).get(...params) as T | undefined;
  }

  all<T>(sql: string, ...params: Param[]): T[] {
    return this.raw.prepare(sql).all(...params) as T[];
  }

  /** Runs `work` atomically. Nested calls join the outer transaction. */
  transaction<T>(work: () => T): T {
    if (this.depth > 0) return work();
    this.raw.exec("BEGIN IMMEDIATE");
    this.depth = 1;
    try {
      const result = work();
      this.raw.exec("COMMIT");
      return result;
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    } finally {
      this.depth = 0;
    }
  }

  close(): void {
    this.raw.close();
  }
}

export const nowIso = (): string => new Date().toISOString();
