// 极简 Turso hrana-v2 HTTP 客户端:只用原生 fetch 直连 /v2/pipeline。
// 背景:@libsql/client 的 hrana 客户端在 Vercel serverless 上会出现难以排查的 401
// (同环境原生 fetch 完全正常),因此远程模式改用这个透明实现,行为可预测、可诊断。

type HranaValue =
  | { type: "null" }
  | { type: "integer"; value: string }
  | { type: "float"; value: number }
  | { type: "text"; value: string }
  | { type: "blob"; base64: string };

export interface RawStmt {
  sql: string;
  args?: unknown[];
}

export interface RawResultSet {
  columns: string[];
  columnTypes: string[];
  rows: unknown[][];
  rowsAffected: number;
  lastInsertRowid: bigint | undefined;
}

function encodeValue(v: unknown): HranaValue {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "boolean") return { type: "integer", value: v ? "1" : "0" };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "float", value: v };
  }
  if (typeof v === "bigint") return { type: "integer", value: v.toString() };
  if (v instanceof Date) return { type: "integer", value: String(v.getTime()) };
  if (v instanceof Uint8Array || Buffer.isBuffer(v)) {
    return { type: "blob", base64: Buffer.from(v as Uint8Array).toString("base64") };
  }
  return { type: "text", value: String(v) };
}

function decodeValue(v: { type: string; value?: string | number | null }): unknown {
  switch (v.type) {
    case "null":
      return null;
    case "integer":
      return Number(v.value);
    case "float":
      return typeof v.value === "number" ? v.value : Number(v.value);
    case "text":
      return v.value;
    case "blob":
      return v.value; // 本项目不存 blob,原样返回
    default:
      return v.value ?? null;
  }
}

interface PipelineResult {
  type: string;
  error?: { message?: string };
  response?: {
    type: string;
    result?: {
      cols: Array<{ name: string }>;
      rows: Array<Array<{ type: string; value?: string | number | null }>>;
      affected_row_count: number;
      last_insert_rowid: string | null;
    };
  };
}

export class RawTursoClient {
  private url: string;
  private token: string;

  constructor(libsqlUrl: string, authToken: string) {
    this.url = libsqlUrl.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");
    this.token = authToken;
  }

  private async pipeline(requests: Array<Record<string, unknown>>): Promise<PipelineResult[]> {
    const resp = await fetch(`${this.url}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: [...requests, { type: "close" }] }),
    });
    if (!resp.ok) {
      throw new Error(`Turso HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    const data = (await resp.json()) as { results: PipelineResult[] };
    return data.results;
  }

  private static toResultSet(r: PipelineResult): RawResultSet {
    if (r.type === "error") {
      throw new Error(`Turso error: ${r.error?.message || "unknown"}`);
    }
    const result = r.response?.result;
    if (!result) {
      return { columns: [], columnTypes: [], rows: [], rowsAffected: 0, lastInsertRowid: undefined };
    }
    return {
      columns: result.cols.map((c) => c.name),
      columnTypes: [],
      rows: result.rows.map((row) => row.map(decodeValue)),
      rowsAffected: result.affected_row_count,
      lastInsertRowid: result.last_insert_rowid ? BigInt(result.last_insert_rowid) : undefined,
    };
  }

  async execute(stmtOrSql: string | RawStmt, args?: unknown[]): Promise<RawResultSet> {
    const stmt: RawStmt = typeof stmtOrSql === "string" ? { sql: stmtOrSql, args: args ?? [] } : stmtOrSql;
    const results = await this.pipeline([
      {
        type: "execute",
        stmt: {
          sql: stmt.sql,
          args: (stmt.args ?? []).map(encodeValue),
          want_rows: true,
        },
      },
    ]);
    return RawTursoClient.toResultSet(results[0]);
  }

  async batch(stmts: RawStmt[]): Promise<RawResultSet[]> {
    const results = await this.pipeline(
      stmts.map((s) => ({
        type: "execute",
        stmt: { sql: s.sql, args: (s.args ?? []).map(encodeValue), want_rows: true },
      }))
    );
    return results.map(RawTursoClient.toResultSet);
  }

  // drizzle 建表 DDL 用:hrana sequence 请求,一次执行多条语句
  async executeMultiple(sql: string): Promise<void> {
    const results = await this.pipeline([{ type: "sequence", sql }]);
    const first = results[0];
    if (first?.type === "error") {
      throw new Error(`Turso error: ${first.error?.message || "unknown"}`);
    }
  }

  async transaction(): Promise<never> {
    throw new Error("RawTursoClient: transactions not supported(项目未使用)");
  }

  async close(): Promise<void> {
    /* 无连接,无需关闭 */
  }

  get protocol(): string {
    return "http";
  }
}
